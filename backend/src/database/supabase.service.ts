import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private client: SupabaseClient;

  constructor(@Optional() @Inject(ConfigService) private configService?: ConfigService) {
    const supabaseUrl = this.configService?.get<string>('supabase.url') || process.env.SUPABASE_URL;
    const supabaseKey = this.configService?.get<string>('supabase.serviceKey') || 
                       this.configService?.get<string>('supabase.key') ||
                       process.env.SUPABASE_SERVICE_KEY ||
                       process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and Key must be provided');
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase client is not initialized. Check that SUPABASE_URL and SUPABASE_KEY are set in environment variables.');
    }
    return this.client;
  }
}

