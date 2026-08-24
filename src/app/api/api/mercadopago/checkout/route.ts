import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";

// Inicializa el cliente de Mercado Pago con el Token de Acceso desde tus variables de entorno
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slug, title, price } = body;

    // Validación básica de los datos recibidos desde el modal
    if (!title || !price) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos (title, price)" },
        { status: 400 }
      );
    }

    const preference = new Preference(client);

    // Creamos la preferencia de pago para el usuario
    const result = await preference.create({
      body: {
        items: [
          {
            id: `plan-${slug || "negocio"}`,
            title: title || "Suscripción Mensual",
            quantity: 1,
            unit_price: Number(price),
            currency_id: "MXN",
          },
        ],
        metadata: {
          slug: slug,
        },
        back_urls: {
          success: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard?status=success`,
          failure: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard?status=failure`,
          pending: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/dashboard?status=pending`,
        },
        auto_return: "approved",
      },
    });

    // Regresamos la URL de checkout (init_point) que espera tu ModalFacturacion
    return NextResponse.json({ init_point: result.init_point });
  } catch (error: any) {
    console.error("Error al crear preferencia en Mercado Pago:", error);
    return NextResponse.json(
      { error: error?.message || "Error interno al procesar pago" },
      { status: 500 }
    );
  }
}