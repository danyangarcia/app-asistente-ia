import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServerAdmin";

const WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const secret = request.headers.get("x-webhook-secret");
  if (secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Invalid webhook secret" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const {
    business_phone,
    customer_phone,
    order_type,
    items,
    total_amount,
    call_id,
  } = payload;

  if (
    !business_phone ||
    !customer_phone ||
    !order_type ||
    !Array.isArray(items) ||
    typeof total_amount !== "number" ||
    !call_id
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const businessResult = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("phone_number", business_phone)
    .single();

  if (businessResult.error || !businessResult.data) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const businessId = businessResult.data.id;

  const orderInsert = await supabaseAdmin
    .from("orders")
    .insert({
      business_id: businessId,
      source: "voice_call",
      customer_name: payload.customer_name ?? null,
      customer_phone,
      order_type,
      delivery_address: payload.delivery_address ?? null,
      status: "new",
      total_amount,
      notes: payload.notes ?? null,
    })
    .select("id")
    .single();

  if (orderInsert.error || !orderInsert.data) {
    return NextResponse.json({ error: "Order creation failed" }, { status: 500 });
  }

  const orderId = orderInsert.data.id;

  const itemsWithIds = await Promise.all(
    items.map(async (item: any) => {
      const menuItem = item.name
        ? await supabaseAdmin
            .from("menu_items")
            .select("id, price")
            .eq("business_id", businessId)
            .ilike("name", item.name)
            .limit(1)
            .single()
        : null;

      return {
        order_id: orderId,
        menu_item_id: menuItem?.data?.id ?? null,
        quantity: item.quantity ?? 1,
        unit_price: item.price ?? menuItem?.data?.price ?? 0,
        customizations: item.customizations ?? null,
        item_name: item.name ?? null,
      };
    })
  );

  const itemsInsert = await supabaseAdmin.from("order_items").insert(itemsWithIds);
  if (itemsInsert.error) {
    return NextResponse.json({ error: "Order items creation failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true, order_id: orderId }, { status: 201 });
}
