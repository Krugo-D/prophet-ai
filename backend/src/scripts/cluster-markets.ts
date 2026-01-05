import { NestFactory } from '@nestjs/core';
import 'reflect-metadata';
import { AppModule } from '../app.module';
import { SupabaseService } from '../database/supabase.service';

/**
 * K-Means Clustering Implementation for Market Embeddings
 */
async function clusterMarkets() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const supabaseService = app.get(SupabaseService);
  const supabase = supabaseService.getClient();

  console.log('=== Starting Semantic Market Clustering ===');

  // 1. Fetch all market embeddings
  const { data: markets, error } = await supabase
    .from('markets')
    .select('market_slug, title, embedding')
    .not('embedding', 'is', null);

  if (error || !markets || markets.length === 0) {
    console.error('Error fetching market embeddings:', error);
    await app.close();
    return;
  }

  console.log(`Analyzing ${markets.length} market vectors...`);

  const numClusters = 12; // Adjust based on how many "Machine Categories" you want
  const dimensions = 768;

  // Initialize centroids randomly from existing markets
  let centroids = markets
    .sort(() => 0.5 - Math.random())
    .slice(0, numClusters)
    .map(m => parseVector(m.embedding));

  function parseVector(v: any): number[] {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') return v.replace(/[\[\]]/g, '').split(',').map(Number);
    return [];
  }

  function cosineSimilarity(a: number[], b: number[]) {
    let dot = 0, mA = 0, mB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      mA += a[i] * a[i];
      mB += b[i] * b[i];
    }
    return dot / (Math.sqrt(mA) * Math.sqrt(mB));
  }

  let marketClusters = new Array(markets.length).fill(0);
  
  // 2. K-Means Loop
  for (let iter = 0; iter < 10; iter++) { // 10 iterations is usually enough for convergence in this context
    console.log(`  Iteration ${iter + 1}/10...`);
    let changed = false;

    // Assign markets to closest centroid
    for (let i = 0; i < markets.length; i++) {
      const v = parseVector(markets[i].embedding);
      let bestSim = -1;
      let bestCluster = 0;

      for (let c = 0; c < numClusters; c++) {
        const sim = cosineSimilarity(v, centroids[c]);
        if (sim > bestSim) {
          bestSim = sim;
          bestCluster = c;
        }
      }

      if (marketClusters[i] !== bestCluster) {
        marketClusters[i] = bestCluster;
        changed = true;
      }
    }

    // Update centroids
    for (let c = 0; c < numClusters; c++) {
      const clusterMarkets = markets.filter((_, i) => marketClusters[i] === c);
      if (clusterMarkets.length > 0) {
        const newCentroid = new Array(dimensions).fill(0);
        for (const m of clusterMarkets) {
          const v = parseVector(m.embedding);
          for (let d = 0; d < dimensions; d++) newCentroid[d] += v[d];
        }
        centroids[c] = newCentroid.map(v => v / clusterMarkets.length);
      }
    }

    if (!changed) break;
  }

  // 3. Name the Clusters (AI Labeling)
  // We'll look at the titles in each cluster and find the most common non-filler words
  const stopWords = new Set(['will', 'the', 'a', 'in', 'by', 'of', 'on', 'to', 'for', 'with', 'be', 'is', 'at', 'win', 'lose', 'yes', 'no']);
  const clusterNames: string[] = [];

  for (let c = 0; c < numClusters; c++) {
    const cMarkets = markets.filter((_, i) => marketClusters[i] === c);
    const wordCounts: { [word: string]: number } = {};
    
    for (const m of cMarkets) {
      const words = m.title.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ');
      for (const w of words) {
        if (w.length > 2 && !stopWords.has(w)) {
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
      }
    }

    const topWords = Object.entries(wordCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([w]) => w.toUpperCase());

    const name = topWords.length > 0 ? topWords.join(' / ') : `CLUSTER ${c + 1}`;
    clusterNames.push(name);
    console.log(`Cluster ${c}: ${name} (${cMarkets.length} markets)`);
  }

  // 4. Save to Database
  console.log('Saving clusters to database...');
  for (let i = 0; i < markets.length; i++) {
    const clusterId = marketClusters[i];
    await supabase
      .from('markets')
      .update({ 
        cluster: clusterId,
        // We no longer overwrite 'category' here to keep it human-readable
      })
      .eq('market_slug', markets[i].market_slug);
  }

  console.log('\n=== Clustering Complete! ===');
  await app.close();
}

clusterMarkets();
