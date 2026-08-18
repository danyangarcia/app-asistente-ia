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

    // 1. HERRAMIENTA / FUNCTION CALL (Si el cliente solicita cancelar)
    if (eventType === "tool-calls") {
      const toolCall = message?.toolCalls?.[0] || message?.toolWithToolCallList?.[0]?.toolCall;
      
      if (toolCall?.function?.name === "cancelarPedido") {
        const args = typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;

        const { id_orden, motivo } = args;

        if (id_orden) {
          // Actualizamos directo en tus columnas reales: 'estado' y 'motivo_cancelacion'
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
    }

    // 2. CONFIGURACIÓN E INYECCIÓN DE VARIABLES (assistant-request)
    if (eventType === "assistant-request") {
      const telefonoCliente = message?.call?.customer?.number || "";

      // A. Cargar prompt del negocio desde 'businesses'
      const { data: business, error: businessError } = await supabaseAdmin
        .from("businesses")
        .select("prompt_config")
        .eq("enlace del panel", "tacos-luis")
        .single();

      if (businessError || !business?.prompt_config) {
        console.error("Error al buscar negocio en Supabase:", businessError);
      }

      // B. Buscar la última orden en 'orders' usando tus columnas exactas
      let clienteNombre = "nuevo";
      let esPedidoActivo = "false";
      let estadoPedido = "ninguno";
      let detallesPedido = "ninguno";
      let idOrdenActiva = "";

      if (telefonoCliente) {
        const { data: ultimaOrden } = await supabaseAdmin
          .from("orders")
          .select("id, cliente_nombre, cliente_telefono, items, estado, created_at")
          .eq("cliente_telefono", telefonoCliente)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ultimaOrden) {
          // Extraer nombre real de tu columna 'cliente_nombre'
          if (ultimaOrden.cliente_nombre && ultimaOrden.cliente_nombre !== "Cliente en llamada") {
            clienteNombre = ultimaOrden.cliente_nombre;
          }

          // Verificar si el pedido fue creado en las últimas 2 horas
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

            // Extraer nombres de productos desde el JSONB de tu columna 'items'
            if (Array.isArray(ultimaOrden.items)) {
              detallesPedido = ultimaOrden.items.map((i: any) => i.nombre || "producto").join(", ");
            } else if (typeof ultimaOrden.items === "string") {
              detallesPedido = ultimaOrden.items;
            }
          }
        }
      }

      // C. Devolver las variables a Vapi conservando tu prompt_config original
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