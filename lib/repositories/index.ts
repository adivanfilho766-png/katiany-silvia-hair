import "server-only";
import { jsonSalonRepository } from "./json-salon-repository";

export function getSalonRepository() {
  return jsonSalonRepository;
}