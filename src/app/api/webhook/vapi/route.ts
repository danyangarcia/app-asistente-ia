import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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
        const { business_slug, cliente_nombre, cliente_telefono, tipo, direccion, items, total } = args;

        // Sanitización genérica: redondea precios unitarios a 2 decimales para evitar montos extraños
        const itemsLimpios = Array.isArray(items) 
          ? items.map((item: any) => ({
              ...item,
              precio: item.precio ? Math.round(Number(item.precio) * 100) / 100 : 0
            }))
          : [];

        const totalLimpio = total ? Math.round(Number(total) * 100) / 100 : 0;

        const { data: nuevaOrden, error: createError } = await supabaseAdmin
          .from("orders")
          .insert({
            business_slug: business_slug || "tacos-luis",
            cliente_nombre: cliente_nombre || "Cliente en llamada",
            cliente_telefono: cliente_telefono || message?.call?.customer?.number || "",
            tipo: tipo || "para_llevar",
            direccion: direccion || "",
            items: itemsLimpios,
            total: totalLimpio,
            estado: "pending",
            origen: "Vapi Call"
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
      // Normalizar número telefónico: extraer últimos 10 dígitos numéricos puros
      const rawPhone = message?.call?.customer?.number || "";
      const telefonoCliente = rawPhone.replace(/\D/g, "").slice(-10);

      // A. Cargar prompt del negocio desde 'businesses'
      const { data: business, error: businessError } = await supabaseAdmin
        .from("businesses")
        .select("prompt_config")
        .eq("enlace del panel", "tacos-luis")
        .single();

      if (businessError || !business?.prompt_config) {
        console.error("Error al buscar negocio en Supabase:", businessError);
      }

      // B. Buscar la última orden en 'orders' con coincidencia flexible por teléfono
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

      // C. Devolver las variables a Vapi
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