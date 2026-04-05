export interface AIResponse {
  text: string;
  confidence: number;
  sources: string[];
  isFallback: boolean;
}

export interface AIStreamResult {
  stream: AsyncGenerator<string>;
  metadata: Promise<Partial<AIResponse>>;
}


export const aiWrapper = {
  /**
   * Helper for exponential backoff retries.
   */
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    initialDelay = 1000
  ): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`AI attempt ${i + 1} failed. Retrying in ${delay}ms...`, error);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    throw lastError;
  },

  /**
   * Generates a streaming response using the primary provider (Claude/Anthropic).
   * Yields text chunks as they arrive.
   */
  async *generateStreamingResponse(prompt: string, _context: any = {}): AsyncGenerator<string> {
    try {
      // For streaming, we'd typically need to handle retries of the initial stream request.
      // Since our mock is internal, we'll wrap a "startStream" call in the retry helper.
      const fullText = await this.retryWithBackoff(async () => {
        return await this.callPrimaryAIInternal(prompt, _context);
      });

      const chunks = fullText.split(' ');
      for (const chunk of chunks) {
        await new Promise((r) => setTimeout(r, 30));
        yield chunk + ' ';
      }
    } catch (error) {
      console.warn('AI Streaming failed after all retries, falling back:', error);
      const fallback = await this.generateFallbackResponse(prompt, _context);
      yield fallback.text;
    }
  },

  async generateResponse(prompt: string, _context: any = {}): Promise<AIResponse> {
    try {
      const responseText = await this.retryWithBackoff(async () => {
        return await this.callPrimaryAIInternal(prompt, _context);
      });

      return {
        text: responseText,
        confidence: 0.92,
        sources: ['SLU Barkborreprognos 2026', 'Sentinel-2 NDVI Data'],
        isFallback: false
      };
    } catch (error) {
      console.warn('AI Primary Provider failed after all retries, falling back:', error);
      return this.generateFallbackResponse(prompt, _context);
    }
  },

  /**
   * Primary AI call logic (mocked for demo)
   */
  async callPrimaryAIInternal(prompt: string, _context: any): Promise<string> {
    if (prompt.toLowerCase().includes('fail')) {
      throw new Error('Simulated API Outage');
    }
    
    return `**Institutional Sync Active:** I have cross-referenced your parcel data with recent SMHI precipitation maps and Skogsstyrelsen trap readings. 

I strongly recommend monitoring for Ips typographus activity in your spruce stands. Thermal accumulation (DD) is currently at 412, which is nearing the 600-swarming threshold. Wind gusts from the NW at 12m/s are predicted tonight, which could increase exposure for vulnerable edge-trees.

**Structural Scan Initiated:** Based on GEDI space-borne LiDAR, your canopy height currently averages 24.5m with a high vertical density (0.82), confirming a successful rotation growth phase.`;
  },

  /**
   * Fallback logic: Uses a combination of local heuristics and RAG results 
   * to provide a baseline useful response without calling an external LLM.
   */
  async generateFallbackResponse(prompt: string, _context: any): Promise<AIResponse> {
    let text = "I'm currently operating in offline/safety mode due to high service demand. ";
    
    if (prompt.toLowerCase().includes('borre') || prompt.toLowerCase().includes('beetle')) {
      text += "General Advice: Forest health sensors indicate moderate risk. Maintain regular field inspections. Consult the 'Field Guides' section for visual identification markers.";
    } else {
      text += "Based on your recent forest data, your stands appear stable. See the 'Intel Center' for detailed growth and risk metrics.";
    }

    return {
      text,
      confidence: 0.65,
      sources: ['Local Heuristic Engine', 'Cached Forest Data'],
      isFallback: true
    };
  }
};

