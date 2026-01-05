import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PredictionServiceClient, helpers } from '@google-cloud/aiplatform';

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private client: PredictionServiceClient;
  private endpoint: string;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    const projectId = this.configService?.get<string>('google.projectId') || process.env.GOOGLE_PROJECT_ID;
    const location = this.configService?.get<string>('google.location') || process.env.GOOGLE_LOCATION || 'us-central1';
    
    this.endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/text-embedding-004`;
    
    // PredictionServiceClient looks for GOOGLE_APPLICATION_CREDENTIALS path
    // OR we can pass credentials directly from an env var string
    const credentialsJson = process.env.GOOGLE_CREDENTIALS;
    const clientOptions: any = {
      apiEndpoint: `${location}-aiplatform.googleapis.com`,
    };

    if (credentialsJson) {
      try {
        clientOptions.credentials = JSON.parse(credentialsJson);
      } catch (e) {
        console.error('Failed to parse GOOGLE_CREDENTIALS env var as JSON');
      }
    }
    
    this.client = new PredictionServiceClient(clientOptions);
  }

  async onModuleInit() {
    const projectId = this.configService?.get<string>('google.projectId') || process.env.GOOGLE_PROJECT_ID;
    if (!projectId) {
      console.warn('GOOGLE_PROJECT_ID not set. EmbeddingService will not function.');
    }
  }

  /**
   * Generate an embedding vector for a given text
   */
  async getEmbedding(text: string): Promise<number[]> {
    try {
      const instance = helpers.toValue({
        content: text,
        task_type: 'RETRIEVAL_DOCUMENT',
      });
      const instances = [instance!];
      
      const parameter = helpers.toValue({
        outputDimensionality: 768,
      });
      const parameters = parameter;

      const [response] = await this.client.predict({
        endpoint: this.endpoint,
        instances,
        parameters,
      });

      if (!response.predictions || response.predictions.length === 0) {
        throw new Error('No predictions returned from Vertex AI');
      }

      // Vertex AI response structure for embeddings
      const prediction = response.predictions[0] as any;
      const values = prediction.structValue?.fields?.embeddings?.structValue?.fields?.values?.listValue?.values;
      
      if (!values) {
        // Fallback for different response formats
        const fallbackValues = (prediction as any).embeddings?.values;
        if (fallbackValues) return fallbackValues;
        throw new Error('Could not parse embedding from response');
      }

      return values.map((v: any) => v.numberValue);
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for a batch of texts
   */
  async getEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const instances = texts.map(text => helpers.toValue({
        content: text,
        task_type: 'RETRIEVAL_DOCUMENT',
      })!);

      const parameters = helpers.toValue({
        outputDimensionality: 768,
      });

      const [response] = await this.client.predict({
        endpoint: this.endpoint,
        instances,
        parameters,
      });

      return (response.predictions || []).map((p: any) => {
        const values = p.structValue?.fields?.embeddings?.structValue?.fields?.values?.listValue?.values;
        return values ? values.map((v: any) => v.numberValue) : [];
      });
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      throw error;
    }
  }
}
