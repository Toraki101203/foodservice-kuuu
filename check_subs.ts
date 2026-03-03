import { createClient } from "@supabase/supabase-js";
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
// Retrieve service role key if available, otherwise use anon key to at least attempt the query
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Fetching subscriptions...");
    const { data: subscriptions, error } = await supabase
        .from("subscriptions")
        .select("*");

    if (error) {
        console.error("Error fetching subscriptions:", error);
    } else {
        console.log("All subscriptions:", subscriptions);

        if (subscriptions.length === 0) {
            console.log("No subscriptions found in the database. The webhook might not be creating the record.");
        }
    }
}

main().catch(console.error);
