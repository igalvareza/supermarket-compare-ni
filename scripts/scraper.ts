import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

interface NormalizedProduct {
    name: string;
    brand: string;
    price: number;
    image: string;
    supermarket: string;
    unit: string;
    amount: number;
    normalizedPrice: number;
    originalData: any;
}

function normalizeProduct(p: any, supermarket: string): NormalizedProduct {
    const name = p.name || p.productName || '';
    const brand = p.brand || p.brandName || 'N/A';
    const price = p.price || p.priceWithTax || 0;
    const image = p.image || p.imageMediumUrl || '';

    const unitRegex = /(\d+(\.\d+)?)\s*(lb|kg|g|oz|ml|l|und|unid|pzs)/i;
    const match = name.match(unitRegex);

    let unit = 'unid';
    let amount = 1;
    let normalizedPrice = price;

    if (match) {
        amount = parseFloat(match[1]);
        unit = match[3].toLowerCase();

        if (unit.includes('lb')) {
            normalizedPrice = price / (amount * 453.59);
        } else if (unit === 'kg') {
            normalizedPrice = price / (amount * 1000);
        } else if (unit === 'oz') {
            normalizedPrice = price / (amount * 28.35);
        } else if (unit === 'g' || unit === 'ml') {
            normalizedPrice = price / amount;
        } else if (unit === 'l') {
            normalizedPrice = price / (amount * 1000);
        }
    }

    return { name, brand, price, image, supermarket, unit, amount, normalizedPrice, originalData: p };
}

async function scrapeWalmart() {
    try {
        const WALMART_API = 'https://www.walmart.com.ni/api/io/_v/api/intelligent-search/product_search/region-id/U1cjd2FsbWFydG5pd200NDIw/category-1/abarrotes/category-2/galletas/category-3/galletas-dulces';
        const response = await axios.get(WALMART_API);
        return (response.data.products || []).map((p: any) => normalizeProduct(p, 'Walmart'));
    } catch (e) { return []; }
}

async function scrapeLaColonia() {
    try {
        const LA_COLONIA_API = 'https://www.lacolonia.com.ni/api/Products/CategoryPath/LACOLONIA/es/4030080';
        const response = await axios.get(LA_COLONIA_API);
        return (response.data || []).map((p: any) => normalizeProduct(p, 'La Colonia'));
    } catch (e) { return []; }
}

async function main() {
    console.log('--- Starting Sync ---');

    // 1. Get Retailer IDs dynamically
    const { data: retailers } = await supabase.from('supermarket_retailers').select('id, name');
    if (!retailers) {
        console.error('Could not fetch retailers. Did you run the SQL migration?');
        return;
    }

    const retailerMap = Object.fromEntries(retailers.map(r => [r.name, r.id]));

    const allProducts = [
        ...(await scrapeWalmart()),
        ...(await scrapeLaColonia())
    ];

    console.log(`Found ${allProducts.length} products. Saving...`);

    for (const p of allProducts) {
        const retailerId = retailerMap[p.supermarket];
        if (!retailerId) continue;

        const { data: productData, error: pErr } = await supabase
            .from('comparison_products')
            .upsert({ name: p.name, brand: p.brand, image_url: p.image, category: 'Abarrotes' }, { onConflict: 'name' })
            .select().single();

        if (pErr || !productData) continue;

        await supabase.from('product_prices').upsert({
            product_id: productData.id,
            supermarket_id: retailerId,
            price: p.price,
            normalized_price: p.normalizedPrice,
            unit_amount: p.amount,
            unit_type: p.unit,
            last_updated: new Date().toISOString()
        }, { onConflict: 'product_id,supermarket_id' });

        await supabase.from('price_history').insert({
            product_id: productData.id,
            supermarket_id: retailerId,
            price: p.price,
            normalized_price: p.normalizedPrice
        });
    }
    console.log('--- Sync Task Completed ---');
}

main();
