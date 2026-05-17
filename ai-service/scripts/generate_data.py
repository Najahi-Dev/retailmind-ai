# ai-service/scripts/generate_data.py

import json
import random
import uuid
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from faker import Faker

fake = Faker()
random.seed(42)
np.random.seed(42)

# ── Config ────────────────────────────────────────
NUM_CATEGORIES     = 10
NUM_PRODUCTS       = 500
NUM_SUPPLIERS      = 30
NUM_LOCATIONS      = 5
NUM_PO             = 2000
HISTORY_DAYS       = 730   # 24 months
START_DATE         = datetime.now() - timedelta(days=HISTORY_DAYS)

# ── Output folder ────────────────────────────────
import os
os.makedirs("data", exist_ok=True)

print("Starting synthetic data generation...")

# ════════════════════════════════════════════════
# 1. LOCATIONS
# ════════════════════════════════════════════════
location_names = [
    "Colombo Warehouse",
    "Kandy Store",
    "Galle Distribution Center",
    "Negombo Store",
    "Jaffna Warehouse",
]

locations = []
for i, name in enumerate(location_names):
    locations.append({
        "id":       str(uuid.uuid4()),
        "name":     name,
        "address":  fake.address().replace("\n", ", "),
        "type":     random.choice([
                      "warehouse",
                      "store",
                      "distribution_center"
                    ]),
        "isActive": True,
    })

df_locations = pd.DataFrame(locations)
df_locations.to_csv("data/locations.csv", index=False)
print(f"✓ Locations: {len(locations)}")


# ════════════════════════════════════════════════
# 2. CATEGORIES
# ════════════════════════════════════════════════
category_names = [
    "Food & Beverages",
    "Electronics",
    "Clothing & Apparel",
    "Household Items",
    "Health & Beauty",
    "Sports & Fitness",
    "Stationery",
    "Toys & Games",
    "Automotive",
    "Garden & Outdoors",
]

# Seasonality config per category
# peak_months = months with highest demand
category_config = {
    "Food & Beverages":   {"peak_months": [11, 12, 1],  "base_demand": 80},
    "Electronics":        {"peak_months": [11, 12],      "base_demand": 40},
    "Clothing & Apparel": {"peak_months": [3, 4, 11],    "base_demand": 50},
    "Household Items":    {"peak_months": [1, 6, 7],     "base_demand": 35},
    "Health & Beauty":    {"peak_months": [1, 2],        "base_demand": 45},
    "Sports & Fitness":   {"peak_months": [1, 6, 7],     "base_demand": 30},
    "Stationery":         {"peak_months": [8, 9],        "base_demand": 25},
    "Toys & Games":       {"peak_months": [11, 12],      "base_demand": 35},
    "Automotive":         {"peak_months": [3, 4],        "base_demand": 20},
    "Garden & Outdoors":  {"peak_months": [3, 4, 5],     "base_demand": 25},
}

categories = []
for name in category_names:
    categories.append({
        "id":          str(uuid.uuid4()),
        "name":        name,
        "description": fake.sentence(),
    })

df_categories = pd.DataFrame(categories)
df_categories.to_csv("data/categories.csv", index=False)
print(f"✓ Categories: {len(categories)}")


# ════════════════════════════════════════════════
# 3. SUPPLIERS
# ════════════════════════════════════════════════
suppliers = []
for _ in range(NUM_SUPPLIERS):
    lead_time = random.randint(3, 21)
    suppliers.append({
        "id":               str(uuid.uuid4()),
        "name":             fake.company(),
        "email":            fake.company_email(),
        "phone":            fake.phone_number(),
        "address":          fake.address().replace("\n", ", "),
        "paymentTerms":     random.choice([
                              "Net 30",
                              "Net 15",
                              "COD",
                              "Net 60",
                              "Prepaid"
                            ]),
        "leadTimeDays":     lead_time,
        "status":           random.choices(
                              ["active", "active", "active", "inactive", "on_hold"],
                              weights=[70, 70, 70, 15, 15]
                            )[0],
        "reliabilityScore": round(random.uniform(60, 99), 2),
        "isActive":         True,
    })

df_suppliers = pd.DataFrame(suppliers)
df_suppliers.to_csv("data/suppliers.csv", index=False)
print(f"✓ Suppliers: {len(suppliers)}")


# ════════════════════════════════════════════════
# 4. PRODUCTS
# ════════════════════════════════════════════════

# Product name templates per category
product_templates = {
    "Food & Beverages":   ["Rice {w}kg",    "Coconut Oil {v}L", "Tea Bags {n}pk",
                           "Sugar {w}kg",   "Milk Powder {w}g", "Biscuits {w}g"],
    "Electronics":        ["USB Cable {n}m","Power Bank {n}mAh","Earphones Pro",
                           "LED Bulb {n}W", "Extension {n}m",   "Phone Case"],
    "Clothing & Apparel": ["T-Shirt {s}",   "Jeans {s}",        "Dress {s}",
                           "Jacket {s}",    "Socks {n}pk",      "Cap"],
    "Household Items":    ["Mop {n}",       "Bucket {n}L",      "Broom",
                           "Dustpan",       "Dish Rack",        "Storage Box {n}L"],
    "Health & Beauty":    ["Shampoo {v}ml", "Soap {n}pk",       "Toothpaste {w}g",
                           "Moisturizer",   "Sunscreen SPF{n}", "Vitamins {n}pk"],
    "Sports & Fitness":   ["Yoga Mat",      "Dumbbell {n}kg",   "Jump Rope",
                           "Water Bottle",  "Resistance Band",  "Gym Gloves"],
    "Stationery":         ["Notebook A{n}", "Pen {n}pk",        "Pencil {n}pk",
                           "Highlighter",   "Stapler",          "Folder {n}pk"],
    "Toys & Games":       ["Board Game",    "Puzzle {n}pc",     "Lego Set {n}",
                           "Action Figure", "Doll",             "Card Game"],
    "Automotive":         ["Engine Oil {v}L","Car Shampoo {v}L","Air Freshener",
                           "Wiper Blade",   "Tire Gauge",       "Jump Cables"],
    "Garden & Outdoors":  ["Plant Pot {n}cm","Garden Gloves",   "Watering Can {n}L",
                           "Seeds Pack",    "Fertilizer {w}kg", "Pruning Shears"],
}

units_per_category = {
    "Food & Beverages":   ["kg", "litre", "pcs"],
    "Electronics":        ["pcs"],
    "Clothing & Apparel": ["pcs"],
    "Household Items":    ["pcs"],
    "Health & Beauty":    ["pcs", "ml"],
    "Sports & Fitness":   ["pcs"],
    "Stationery":         ["pcs", "box"],
    "Toys & Games":       ["pcs"],
    "Automotive":         ["pcs", "litre"],
    "Garden & Outdoors":  ["pcs", "kg"],
}

products = []
sku_counter = 1000

for cat in categories:
    cat_name     = cat["name"]
    templates    = product_templates.get(cat_name, ["Product {n}"])
    units        = units_per_category.get(cat_name, ["pcs"])
    config       = category_config.get(cat_name, {"base_demand": 30})
    prods_per_cat = NUM_PRODUCTS // NUM_CATEGORIES

    for _ in range(prods_per_cat):
        template = random.choice(templates)
        name = (template
                .replace("{n}", str(random.randint(1, 100)))
                .replace("{w}", str(random.choice([100,200,500,1000])))
                .replace("{v}", str(random.choice([1, 2, 5])))
                .replace("{s}", random.choice(["S","M","L","XL"]))
                .replace("{pk}", str(random.choice([6,12,24]))))

        cost_price    = round(random.uniform(50, 5000), 2)
        selling_price = round(cost_price * random.uniform(1.15, 1.60), 2)
        reorder_point = random.randint(10, 100)
        safety_stock  = int(reorder_point * random.uniform(0.2, 0.5))

        sku_counter += 1
        products.append({
            "id":                str(uuid.uuid4()),
            "categoryId":        cat["id"],
            "primarySupplierId": random.choice(suppliers)["id"],
            "sku":               f"SKU-{sku_counter}",
            "name":              name,
            "unit":              random.choice(units),
            "costPrice":         cost_price,
            "sellingPrice":      selling_price,
            "reorderPoint":      reorder_point,
            "safetyStock":       safety_stock,
            "isActive":          True,
            "categoryName":      cat_name,
            "baseDemand":        config["base_demand"],
            "peakMonths":        json.dumps(
                                   config.get("peak_months", [])
                                 ),
        })

df_products = pd.DataFrame(products)
df_products.to_csv("data/products.csv", index=False)
print(f"✓ Products: {len(products)}")


# ════════════════════════════════════════════════
# 5. STOCK MOVEMENTS (24 months history)
# ════════════════════════════════════════════════

def get_demand_for_date(base_demand, peak_months, date):
    """
    Realistic demand with:
    - Seasonality (peak months)
    - Weekly pattern (weekends higher)
    - Random noise
    - Occasional spikes
    """
    month       = date.month
    day_of_week = date.weekday()  # 0=Mon, 6=Sun

    # Seasonal multiplier
    if month in peak_months:
        seasonal = random.uniform(1.4, 2.0)
    elif (month - 1) % 12 in peak_months or (month + 1) % 12 in peak_months:
        seasonal = random.uniform(1.1, 1.4)   # shoulder months
    else:
        seasonal = random.uniform(0.6, 1.0)

    # Weekend boost
    weekend = 1.3 if day_of_week >= 5 else 1.0

    # Random noise
    noise = random.uniform(0.7, 1.3)

    # Occasional demand spike (5% chance)
    spike = random.uniform(2.0, 4.0) if random.random() < 0.05 else 1.0

    demand = base_demand * seasonal * weekend * noise * spike
    return max(0, int(demand))


print("Generating stock movements (this takes ~30 seconds)...")

movements   = []
inventory   = {}   # product_id → current stock

# Initialise inventory for each product
for product in products:
    loc_id  = random.choice(locations)["id"]
    on_hand = random.randint(
                product["reorderPoint"] * 2,
                product["reorderPoint"] * 5
              )
    inventory[product["id"]] = {
        "locationId": loc_id,
        "onHand":     on_hand,
    }

date = START_DATE
movement_id = 0

while date <= datetime.now():
    for product in products:
        pid         = product["id"]
        peak_months = json.loads(product["peakMonths"])
        base_demand = product["baseDemand"]
        loc_id      = inventory[pid]["locationId"]

        # Daily stock-out (sales)
        demand = get_demand_for_date(base_demand, peak_months, date)

        if demand > 0 and inventory[pid]["onHand"] > 0:
            actual_out = min(demand, inventory[pid]["onHand"])
            inventory[pid]["onHand"] -= actual_out
            movement_id += 1
            movements.append({
                "id":         str(uuid.uuid4()),
                "productId":  pid,
                "locationId": loc_id,
                "type":       "stock_out",
                "reason":     "Sale",
                "quantity":   -actual_out,
                "reference":  f"SALE-{movement_id}",
                "createdAt":  date.isoformat(),
                "sku":        product["sku"],
            })

        # Restock when below reorder point
        if inventory[pid]["onHand"] < product["reorderPoint"]:
            restock_qty = random.randint(
                            product["reorderPoint"] * 2,
                            product["reorderPoint"] * 4
                          )
            inventory[pid]["onHand"] += restock_qty
            movement_id += 1
            movements.append({
                "id":         str(uuid.uuid4()),
                "productId":  pid,
                "locationId": loc_id,
                "type":       "stock_in",
                "reason":     "Restock",
                "quantity":   restock_qty,
                "reference":  f"PO-{movement_id}",
                "createdAt":  date.isoformat(),
                "sku":        product["sku"],
            })

        # Random adjustment (1% chance per day)
        if random.random() < 0.01:
            adj = random.randint(-5, 5)
            inventory[pid]["onHand"] = max(0, inventory[pid]["onHand"] + adj)
            movements.append({
                "id":         str(uuid.uuid4()),
                "productId":  pid,
                "locationId": loc_id,
                "type":       "adjustment",
                "reason":     random.choice([
                                "Damage",
                                "Shrinkage",
                                "Count Correction"
                              ]),
                "quantity":   adj,
                "reference":  f"ADJ-{movement_id}",
                "createdAt":  date.isoformat(),
                "sku":        product["sku"],
            })

    date += timedelta(days=1)

df_movements = pd.DataFrame(movements)
df_movements.to_csv("data/stock_movements.csv", index=False)
print(f"✓ Stock movements: {len(movements):,}")


# ════════════════════════════════════════════════
# 6. CURRENT INVENTORY (snapshot)
# ════════════════════════════════════════════════
inventory_records = []
for product in products:
    pid     = product["id"]
    on_hand = inventory[pid]["onHand"]
    reserved = random.randint(0, max(0, on_hand - 5))
    inventory_records.append({
        "id":          str(uuid.uuid4()),
        "productId":   pid,
        "locationId":  inventory[pid]["locationId"],
        "onHand":      on_hand,
        "reserved":    reserved,
        "available":   on_hand - reserved,
        "lastUpdated": datetime.now().isoformat(),
        "sku":         product["sku"],
        "productName": product["name"],
        "reorderPoint":product["reorderPoint"],
        "safetyStock": product["safetyStock"],
        "status":      (
            "critical" if on_hand < product["safetyStock"]
            else "low"  if on_hand < product["reorderPoint"]
            else "healthy"
        ),
    })

df_inventory = pd.DataFrame(inventory_records)
df_inventory.to_csv("data/inventory.csv", index=False)
print(f"✓ Inventory snapshots: {len(inventory_records)}")


# ════════════════════════════════════════════════
# 7. PURCHASE ORDERS
# ════════════════════════════════════════════════
statuses = ["delivered", "delivered", "delivered", "shipped",
            "confirmed", "sent", "draft", "cancelled"]

purchase_orders = []
po_line_items   = []

for i in range(NUM_PO):
    supplier   = random.choice(suppliers)
    po_date    = START_DATE + timedelta(
                   days=random.randint(0, HISTORY_DAYS)
                 )
    status     = random.choice(statuses)
    num_items  = random.randint(1, 8)
    po_products = random.sample(products, num_items)

    total_value = 0
    lines       = []
    for prod in po_products:
        qty        = random.randint(50, 500)
        unit_cost  = prod["costPrice"]
        line_total = qty * unit_cost
        total_value += line_total
        lines.append({
            "id":               str(uuid.uuid4()),
            "poId":             None,   # filled below
            "productId":        prod["id"],
            "quantityOrdered":  qty,
            "quantityReceived": qty if status == "delivered" else 0,
            "unitCost":         unit_cost,
            "lineTotal":        line_total,
            "sku":              prod["sku"],
            "productName":      prod["name"],
        })

    po_id = str(uuid.uuid4())
    for line in lines:
        line["poId"] = po_id
    po_line_items.extend(lines)

    delivery_date = po_date + timedelta(
                      days=supplier["leadTimeDays"] + random.randint(-2, 5)
                    )

    purchase_orders.append({
        "id":                po_id,
        "supplierId":        supplier["id"],
        "supplierName":      supplier["name"],
        "poNumber":          f"PO-{2024000 + i}",
        "status":            status,
        "totalValue":        round(total_value, 2),
        "requestedDelivery": delivery_date.date().isoformat(),
        "createdAt":         po_date.isoformat(),
    })

df_pos   = pd.DataFrame(purchase_orders)
df_lines = pd.DataFrame(po_line_items)
df_pos.to_csv("data/purchase_orders.csv",  index=False)
df_lines.to_csv("data/po_line_items.csv",  index=False)
print(f"✓ Purchase orders:  {len(purchase_orders)}")
print(f"✓ PO line items:    {len(po_line_items)}")


# ════════════════════════════════════════════════
# 8. SEASONAL EVENT CALENDAR
# ════════════════════════════════════════════════
events = [
    # Sri Lanka public holidays + retail peaks
    {"name": "New Year Sale",          "month": 1,  "day": 1,  "demandMultiplier": 2.5},
    {"name": "Thai Pongal",            "month": 1,  "day": 14, "demandMultiplier": 1.8},
    {"name": "Valentine's Day",        "month": 2,  "day": 14, "demandMultiplier": 1.6},
    {"name": "Sinhala New Year",       "month": 4,  "day": 13, "demandMultiplier": 2.8},
    {"name": "Sinhala New Year Day 2", "month": 4,  "day": 14, "demandMultiplier": 2.5},
    {"name": "Vesak",                  "month": 5,  "day": 15, "demandMultiplier": 1.9},
    {"name": "Mid-Year Sale",          "month": 6,  "day": 15, "demandMultiplier": 1.7},
    {"name": "Back to School",         "month": 8,  "day": 20, "demandMultiplier": 2.0},
    {"name": "Deepavali",              "month": 10, "day": 20, "demandMultiplier": 2.2},
    {"name": "Black Friday",           "month": 11, "day": 25, "demandMultiplier": 3.0},
    {"name": "Christmas Eve",          "month": 12, "day": 24, "demandMultiplier": 2.8},
    {"name": "Christmas Day",          "month": 12, "day": 25, "demandMultiplier": 3.2},
    {"name": "Boxing Day Sale",        "month": 12, "day": 26, "demandMultiplier": 2.6},
    {"name": "New Year Eve",           "month": 12, "day": 31, "demandMultiplier": 2.4},
]

df_events = pd.DataFrame(events)
df_events.to_csv("data/seasonal_events.csv", index=False)
print(f"✓ Seasonal events: {len(events)}")


# ════════════════════════════════════════════════
# 9. SUMMARY STATS
# ════════════════════════════════════════════════
print("\n" + "="*50)
print("DATASET GENERATION COMPLETE")
print("="*50)
print(f"  Locations:       {len(locations)}")
print(f"  Categories:      {len(categories)}")
print(f"  Suppliers:       {len(suppliers)}")
print(f"  Products:        {len(products)}")
print(f"  Stock movements: {len(movements):,}")
print(f"  Inventory:       {len(inventory_records)}")
print(f"  Purchase orders: {len(purchase_orders)}")
print(f"  PO line items:   {len(po_line_items):,}")
print(f"  Seasonal events: {len(events)}")
print("="*50)
print("\nFiles saved to: ai-service/data/")
print("  locations.csv")
print("  categories.csv")
print("  suppliers.csv")
print("  products.csv")
print("  stock_movements.csv")
print("  inventory.csv")
print("  purchase_orders.csv")
print("  po_line_items.csv")
print("  seasonal_events.csv")