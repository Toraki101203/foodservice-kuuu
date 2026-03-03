import { createClient } from "@supabase/supabase-js";

// .env.localから環境変数を直接読み込む（必要に応じて）
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim();
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
    console.log("Fetching profiles...");
    const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

    if (pError) {
        console.error("Error fetching profiles:", pError);
    } else {
        console.log("Profiles (latest 5):", profiles);
    }

    console.log("Fetching shops...");
    const { data: shops, error: sError } = await supabase
        .from("shops")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

    if (sError) {
        console.error("Error fetching shops:", sError);
    } else {
        console.log("Shops (latest 5):", shops);
    }
}

main().catch(console.error);
