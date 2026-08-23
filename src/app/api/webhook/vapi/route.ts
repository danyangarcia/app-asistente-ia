import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const payload = await request.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ error: "Payload no válido" }, { status: 400 });
    }

    const message = payload?.message || payload;
    const eventType = message?.type;

    console.log("Evento recibido de Vapi:", eventType);

    // 1. MANEJO DE HERRAMIENTAS / FUNCTION CALLS (tool-calls)
    if (eventType === "tool-calls") {
      const toolCall = message?.toolCalls?.[0] || message?.toolWithToolCallList?.[0]?.toolCall;
      const functionName = toolCall?.function?.name;

      const args = typeof toolCall?.function?.arguments === "string"
        ? JSON.parse(toolCall.function.arguments)
        : toolCall?.function?.arguments || {};

      // A. HERRAMIENTA: cancelarPedido
      if (functionName === "cancelarPedido") {
        const { id_orden, motivo } = args;

        if (id_orden) {
          await supabaseAdmin
            .from("orders")
            .update({
              estado: "cancelled",
              motivo_cancelacion: motivo || "Cancelado por el cliente durante la llamada"
            })
            .eq("id", id_orden);
        }

        return NextResponse.json({
          results: [
            {
              toolCallId: toolCall.id,
              result: "El pedido ha sido marcado como 'cancelled' correctamente."
            }
          ]
        });
      }

      // B. HERRAMIENTA: crear_orden
      if (functionName === "crear_orden") {
        const callId = message?.call?.id;
        const rawPhone = message?.call?.customer?.number || args.cliente_telefono || "";
        const telefonoCliente = rawPhone.replace(/\D/g, "").slice(-10);

        const { business_slug, cliente_nombre, tipo, direccion, items } = args;
        const slugNegocio = business_slug || message?.call?.assistant?.metadata?.business_slug || "tacos-luis";

        let nombreLimpio = cliente_nombre && cliente_nombre.toLowerCase() !== "nuevo"
          ? cliente_nombre
          : "Cliente en llamada";

        let totalCalculado = 0;
        const itemsProcesados = [];

        if (Array.isArray(items)) {
          for (const item of items) {
            const nombreItem = item.nombre || item.name || "";
            const cantidad = Number(item.cantidad || item.quantity || 1);

            const { data: productoBD } = await supabaseAdmin
              .from("catalog_items")
              .select("price, nombre")
              .eq("business_slug", slugNegocio)
              .ilike("nombre", `%${nombreItem.trim()}%`)
              .maybeSingle();

            let precioUnitario = productoBD?.price ? Number(productoBD.price) : 0;
           
            if (precioUnitario === 0 && (nombreItem.toLowerCase().includes("pepsi") || nombreItem.toLowerCase().includes("soda") || nombreItem.toLowerCase().includes("refresco"))) {
              const { data: prodSoda } = await supabaseAdmin
                .from("catalog_items")
                .select("price")
                .eq("business_slug", slugNegocio)
                .ilike("nombre", `%refresco%`)
                .maybeSingle();
              if (prodSoda?.price) precioUnitario = Number(prodSoda.price);
            }

            const subtotal = precioUnitario * cantidad;
            totalCalculado += subtotal;

            itemsProcesados.push({
              nombre: productoBD?.nombre || nombreItem,
              cantidad: cantidad,
              precio: precioUnitario,
              subtotal: subtotal,
              notas: item.notas || ""
            });
          }
        }

        const totalLimpio = Math.round(totalCalculado * 100) / 100;

        let ordenExistente = null;
        if (telefonoCliente) {
          const { data: encontrada } = await supabaseAdmin
            .from("orders")
            .select("id, items, total, estado")
            .eq("business_slug", slugNegocio)
            .ilike("cliente_telefono", `%${telefonoCliente}%`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (encontrada && encontrada.estado !== "cancelled" && encontrada.estado !== "completed" && encontrada.estado !== "entregado") {
            ordenExistente = encontrada;
          }
        }

        let idOrdenFinal;

        if (ordenExistente) {
          const itemsActualizados = [...(ordenExistente.items || []), ...itemsProcesados];
          const nuevoTotalGeneral = Number(ordenExistente.total || 0) + totalLimpio;

          const updateData: any = {
            items: itemsActualizados,
            total: nuevoTotalGeneral
          };

          if (nombreLimpio !== "Cliente en llamada") {
            updateData.cliente_nombre = nombreLimpio;
          }

          await supabaseAdmin
            .from("orders")
            .update(updateData)
            .eq("id", ordenExistente.id);

          idOrdenFinal = ordenExistente.id;
        } else {
          const { data: nuevaOrden, error: createError } = await supabaseAdmin
            .from("orders")
            .insert({
              business_slug: slugNegocio,
              cliente_nombre: nombreLimpio,
              cliente_telefono: telefonoCliente || "No especificado",
              tipo: tipo || "para_llevar",
              direccion: direccion || "",
              items: itemsProcesados,
              total: totalLimpio,
              estado: "pending",
              origen: "Vapi Call",
              vapi_call_id: callId || null
            })
            .select("id")
            .single();

          if (createError) {
            console.error("Error guardando orden:", createError);
            return NextResponse.json({
              results: [{ toolCallId: toolCall.id, result: "Error interno al guardar la orden." }]
            });
          }

          idOrdenFinal = nuevaOrden.id;
        }

        return NextResponse.json({
          results: [
            {
              toolCallId: toolCall.id,
              result: `Pedido procesado correctamente. ID de orden: ${idOrdenFinal}`
            }
          ]
        });
      }

      // C. HERRAMIENTA: consultar_menu_supbase
      if (functionName === "consultar_menu_supbase") {
        const targetSlug = args.business_slug || message?.call?.assistant?.metadata?.business_slug || "tacos-luis";
        const { data: menu } = await supabaseAdmin
          .from("catalog_items")
          .select("nombre, categoria, precio")
          .eq("business_slug", targetSlug)
          .eq("disponible", true);

        return NextResponse.json({
          results: [
            {
              toolCallId: toolCall.id,
              result: JSON.stringify(menu || [])
            }
          ]
        });
      }

      // D. HERRAMIENTA: verificar_estado_negocio
      if (functionName === "verificar_estado_negocio") {
        const targetSlug = args.business_slug || message?.call?.assistant?.metadata?.business_slug || "tacos-luis";
        const { data: bizStatus } = await supabaseAdmin
          .from("businesses")
          .select("is_manual_closed")
          .eq('"enlace del panel"', targetSlug)
          .maybeSingle();

        const estaCerradoManual = bizStatus?.is_manual_closed;

        if (estaCerradoManual) {
          return NextResponse.json({
            results: [
              {
                toolCallId: toolCall.id,
                result: JSON.stringify({ estado: "cerrado", mensaje: "El negocio se encuentra cerrado por el momento." })
              }
            ]
          });
        }

        return NextResponse.json({
          results: [
            {
              toolCallId: toolCall.id,
              result: JSON.stringify({ estado: "abierto", mensaje: "El negocio está operando normalmente." })
            }
          ]
        });
      }
    }

    // 2. CONFIGURACIÓN E INYECCIÓN DE VARIABLES (assistant-request)
    if (eventType === "assistant-request") {
      const rawPhone = message?.call?.customer?.number || "";
      const telefonoCliente = rawPhone.replace(/\D/g, "").slice(-10);

      const targetSlug = message?.call?.assistant?.metadata?.business_slug || "tacos-luis";

      const { data: business, error: businessError } = await supabaseAdmin
        .from("businesses")
        .select("prompt_config, is_manual_closed")
        .eq('"enlace del panel"', targetSlug)
        .maybeSingle();

      if (businessError || !business) {
        console.error("Error al buscar negocio en Supabase:", businessError);
      }

      let clienteNombre = "nuevo";
      let esPedidoActivo = "false";
      let estadoPedido = "ninguno";
      let detallesPedido = "ninguno";
      let idOrdenActiva = "";

      if (telefonoCliente) {
        const { data: ultimaOrden } = await supabaseAdmin
          .from("orders")
          .select("id, cliente_nombre, cliente_telefono, items, estado, created_at")
          .ilike("cliente_telefono", `%${telefonoCliente}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ultimaOrden) {
          if (ultimaOrden.cliente_nombre && ultimaOrden.cliente_nombre !== "Cliente en llamada") {
            clienteNombre = ultimaOrden.cliente_nombre;
          }

          const dosHorasAtras = new Date(Date.now() - 2 * 60 * 60 * 1000);
          const fechaOrden = new Date(ultimaOrden.created_at);

          const estaActivo = fechaOrden > dosHorasAtras &&
            ultimaOrden.estado !== "cancelled" &&
            ultimaOrden.estado !== "completed" &&
            ultimaOrden.estado !== "entregado";

          if (estaActivo) {
            esPedidoActivo = "true";
            estadoPedido = ultimaOrden.estado || "pendiente";
            idOrdenActiva = ultimaOrden.id;

            if (Array.isArray(ultimaOrden.items)) {
              detallesPedido = ultimaOrden.items.map((i: any) => i.nombre || "producto").join(", ");
            } else if (typeof ultimaOrden.items === "string") {
              detallesPedido = ultimaOrden.items;
            }
          }
        }
      }

      const estaCerrado = business?.is_manual_closed ?? false;

      return NextResponse.json({
        assistant: {
          variableValues: {
            nombre_cliente: clienteNombre,
            tiene_pedido_activo: esPedidoActivo,
            estado_pedido: estadoPedido,
            detalles_pedido: detallesPedido,
            id_orden: idOrdenActiva,
            cuenta_activa: !estaCerrado ? "true" : "false"
          },
          ...(business?.prompt_config && {
            model: {
              messages: [
                {
                  role: "system",
                  content: business.prompt_config
                }
              ]
            }
          })
        },
        success: true
      });
    }

    // 3. FIN DE LLAMADA: PROCESAMIENTO Y DEDUCCIÓN EXACTA DE MINUTOS (end-of-call-report)
    if (eventType === "end-of-call-report") {
      const call = message?.call;
      const durationSeconds = Number(call?.endedAt ? (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000 : call?.durationSeconds || 0);

      // CÁLCULO EXACTO EN DECIMALES: 16.3 seg -> 0.27 min
      const minutesToDeduct = Number((durationSeconds / 60).toFixed(2));

      const targetSlug = call?.assistant?.metadata?.business_slug || "tacos-luis";

      // Obtener el ID del negocio
      const { data: business } = await supabaseAdmin
        .from("businesses")
        .select("id")
        .eq('"enlace del panel"', targetSlug)
        .maybeSingle();

      if (business?.id && minutesToDeduct > 0) {
        // Registrar llamada
        await supabaseAdmin.from("vapi_calls_log").insert({
          business_id: business.id,
          call_id: call?.id,
          duration_seconds: durationSeconds,
          minutes_charged: minutesToDeduct,
          status: call?.endedReason || "completed"
        });

        // Buscar periodo activo
        const { data: period } = await supabaseAdmin
          .from("billing_periods")
          .select("id")
          .eq("business_id", business.id)
          .eq("is_active", true)
          .maybeSingle();

        if (period?.id) {
          // Descontar saldo exacto en el Ledger
          await supabaseAdmin.from("usage_ledger").insert({
            business_id: business.id,
            billing_period_id: period.id,
            type: "CALL_USAGE",
            credit_type: "INCLUDED",
            amount: -minutesToDeduct,
            description: `Llamada Vapi ID: ${call?.id}`
          });
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error("Error crítico en el webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}