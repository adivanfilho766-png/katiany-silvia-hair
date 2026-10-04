import "server-only";
import { supabaseSalonRepository } from "./supabase-salon-repository";

export function getSalonRepository() {
  return supabaseSalonRepository;
}