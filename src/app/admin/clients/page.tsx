// Redirect diretto: la lista clienti è già in /admin (dashboard home)
import { redirect } from "next/navigation";

export default function ClientsIndex() {
  redirect("/admin");
}
