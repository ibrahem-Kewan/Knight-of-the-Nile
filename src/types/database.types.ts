// Auto-generated placeholder. Replace by running: npm run db:types
// (supabase gen types typescript --local > src/types/database.types.ts)
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "super_admin" | "admin" | "coach" | "judge" | "athlete";
    };
  };
}
