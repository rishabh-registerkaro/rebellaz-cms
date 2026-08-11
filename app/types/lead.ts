export interface Lead {
  _id: string;
  name: string;
  email: string;
  phoneNo: string;
  status: "new" | "contacted" | "converted" | "lost";
  leadSource: string;
  /** Form-specific fields as {"Field Label": value} pairs */
  formData?: Record<string, string> | null;
  /** Public URL of the CV uploaded with the website form, if any. */
  attachmentUrl?: string | null;
  /** The visitor's original filename, for display. */
  attachmentName?: string | null;
  createdAt: string;
  updatedAt: string;
}