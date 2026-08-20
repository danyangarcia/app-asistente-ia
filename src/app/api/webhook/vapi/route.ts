import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js"; // Asegúrate de importar createClient si lo usas en otro archivo

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

      // B. HERRAMIENTA: crear_orden (CON PARCHE DE PRECIOS Y ANTIDUPLICADOS)
      if (functionName === "crear_orden") {
        const callId = message?.call?.id;

        // 1. Candado Antiduplicados: Si esta llamada ya creó un pedido, lo bloqueamos
        if (callId) {
          const { data: ordenDuplicada } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("vapi_call_id", callId)
            .maybeSingle();

          if (ordenDuplicada) {
            console.log("Intento de orden duplicada bloqueado para la llamada:", callId);
            return NextResponse.json({
              results: [{ toolCallId: toolCall.id, result: `El pedido ya fue registrado con éxito anteriormente. ID: ${ordenDuplicada.id}` }]
            });
          }
        }

        const { business_slug, cliente_nombre, cliente_telefono, tipo, direccion, items } = args;
        const slugNegocio = business_slug || "tacos-luis";

        // 2. Leer precios reales desde catalog_items de Supabase
        let totalCalculado = 0;
        const itemsProcesados = [];

        if (Array.isArray(items)) {
          for (const item of items) {
            // Buscamos el precio real del producto en la base de datos por nombre
            const { data: productoBD } = await supabaseAdmin
              .from("catalog_items")
              .select("price")
              .eq("business_slug", slugNegocio)
              .ilike("nombre", `%${item.nombre || item.name || ""}%`)
              .maybeSingle();

            // Si encuentra el producto usa su precio, si no, usa 0 para evitar fallos
            const precioUnitario = productoBD?.price ? Number(productoBD.price) : 0;
            const cantidad = Number(item.cantidad || item.quantity || 1);
            const subtotal = precioUnitario * cantidad;

            totalCalculado += subtotal;

            itemsProcesados.push({
              nombre: item.nombre || item.name || "Taco",
              cantidad: cantidad,
              precio: precioUnitario,
              subtotal: subtotal
            });
          }
        }

        const totalLimpio = Math.round(totalCalculado * 100) / 100;

        // 3. Guardar en la base de datos con los precios reales y el vapi_call_id
        const { data: nuevaOrden, error: createError } = await supabaseAdmin
          .from("orders")
          .insert({
            business_slug: slugNegocio,
            cliente_nombre: cliente_nombre || "Cliente en llamada",
            cliente_telefono: cliente_telefono || message?.call?.customer?.number || "",
            tipo: tipo || "para_llevar",
            direccion: direccion || "",
            items: itemsProcesados,
            total: totalLimpio,
            estado: "pending",
            origen: "Vapi Call",
            vapi_call_id: callId || null // Guardamos el ID de la llamada como candado
          })
          .select("id")
          .single();

        if (createError) {
          console.error("Error guardando orden:", createError);
          return NextResponse.json({
            results: [{ toolCallId: toolCall.id, result: "Error interno al guardar la orden." }]
          });
        }

        return NextResponse.json({
          results: [
            {
              toolCallId: toolCall.id,
              result: `Orden creada exitosamente con ID: ${nuevaOrden.id}`
            }
          ]
        });
      }

      // C. HERRAMIENTA: consultar_menu_supbase
      if (functionName === "consultar_menu_supbase") {
        const { data: menu } = await supabaseAdmin
          .from("catalog_items")
          .select("nombre, categoria, precio")
          .eq("business_slug", args.business_slug || "tacos-luis")
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

      const { data: business, error: businessError } = await supabaseAdmin
        .from("businesses")
        .select("prompt_config")
        .eq("enlace del panel", "tacos-luis")
        .single();

      if (businessError || !business?.prompt_config) {
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

      return NextResponse.json({
        assistant: {
          variableValues: {
            nombre_cliente: clienteNombre,
            tiene_pedido_activo: esPedidoActivo,
            estado_pedido: estadoPedido,
            detalles_pedido: detallesPedido,
            id_orden: idOrdenActiva
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

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    console.error("Error crítico en el webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}