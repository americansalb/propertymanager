import { redirect } from "next/navigation";

/**
 * The separate edit form is gone: the property page edits in place
 * (name, type, address, units, details). Old links land safely.
 */
export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/landlord/properties/${id}`);
}
