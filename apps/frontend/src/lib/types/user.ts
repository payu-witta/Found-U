import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  display_name: z.string(),
  created_at: z.string().datetime(),
});

export type User = z.infer<typeof UserSchema>;
