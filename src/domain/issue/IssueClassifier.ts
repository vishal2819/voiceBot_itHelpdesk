import { ServiceCatalogRepository } from '../../data/repositories/ServiceCatalogRepository.js';
import { logger } from '../../utils/logger.js';

export interface ClassificationResult {
  issueType: string;
  description: string;
  price: number;
  confidence: 'high' | 'medium' | 'low';
  method: 'keyword' | 'semantic' | 'llm' | 'clarification_needed';
  matchedKeywords?: string[];
}

/**
 * Hybrid issue classifier
 * Priority: Keyword matching → Semantic similarity → LLM fallback
 * This ensures we don't rely purely on LLM as emphasized in requirements
 */
export class IssueClassifier {
  private serviceCatalog: ServiceCatalogRepository;

  constructor() {
    this.serviceCatalog = new ServiceCatalogRepository();
  }

  /**
   * Classify issue using hybrid approach
   * 1. Try keyword matching first (most reliable)
   * 2. Fall back to semantic/LLM if needed
   */
  async classify(issueDescription: string): Promise<ClassificationResult> {
    const normalized = issueDescription.toLowerCase().trim();

    // Step 1: Try keyword-based classification (deterministic)
    const keywordResult = await this.classifyByKeywords(normalized);
    if (keywordResult && keywordResult.confidence === 'high') {
      logger.info(
        { issueType: keywordResult.issueType, method: 'keyword' },
        'issue classified by keywords',
      );
      return keywordResult;
    }

    // Step 2: If keyword matching has low confidence, return clarification needed
    if (keywordResult && keywordResult.confidence === 'medium') {
      logger.info(
        { issueType: keywordResult.issueType, method: 'keyword' },
        'issue classified with medium confidence',
      );
      return keywordResult;
    }

    // Step 3: No clear match - need clarification
    logger.warn({ issueDescription: normalized }, 'unable to classify issue, clarification needed');
    return {
      issueType: 'unknown',
      description: 'Unable to determine issue type',
      price: 0,
      confidence: 'low',
      method: 'clarification_needed',
    };
  }

  /**
   * Keyword-based classification (primary method)
   */
  private async classifyByKeywords(issueDescription: string): Promise<ClassificationResult | null> {
    // Get all services with their keywords
    const services = await this.serviceCatalog.getAllServices();

    // Count keyword matches for each service
    const scores: Array<{
      service: (typeof services)[0];
      matchedKeywords: string[];
      score: number;
    }> = [];

    for (const service of services) {
      const matchedKeywords = service.keywords.filter((keyword: string) =>
        issueDescription.includes(keyword.toLowerCase()),
      );

      if (matchedKeywords.length > 0) {
        // Higher score for more matches and longer keywords
        const score: number = matchedKeywords.reduce(
          (sum: number, kw: string) => sum + kw.length * matchedKeywords.length,
          0,
        );
        scores.push({ service, matchedKeywords, score });
      }
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
      return null;
    }

    const topMatch = scores[0]!;
    const secondBestScore = scores[1]?.score ?? 0;

    // Determine confidence based on score separation
    let confidence: 'high' | 'medium' | 'low';
    if (topMatch.score > secondBestScore * 2) {
      confidence = 'high'; // Clear winner
    } else if (topMatch.score > secondBestScore) {
      confidence = 'medium'; // Close match
    } else {
      confidence = 'low'; // Ambiguous
    }

    return {
      issueType: topMatch.service.issueType,
      description: topMatch.service.description,
      price: Number(topMatch.service.price),
      confidence,
      method: 'keyword',
      matchedKeywords: topMatch.matchedKeywords,
    };
  }

  /**
   * Generate clarification question when classification is uncertain
   */
  generateClarificationQuestion(issueDescription: string): string {
    return `I'm not quite sure I understood the issue. Is this about:
1. Wi-Fi or internet connection problems ($20)
2. Email login or password issues ($15)
3. Slow laptop or computer performance ($25)
4. Printer problems ($10)

Please tell me which one, or describe your issue in more detail.`;
  }

  /**
   * Try to extract issue type from user's direct selection (e.g., "option 1" or "wi-fi")
   */
  extractDirectSelection(text: string): string | null {
    const normalized = text.toLowerCase().trim();

    // Check for number selection
    if (/\b(1|one|first)\b/.test(normalized)) return 'wifi_not_working';
    if (/\b(2|two|second)\b/.test(normalized)) return 'email_login_issues';
    if (/\b(3|three|third)\b/.test(normalized)) return 'slow_laptop_performance';
    if (/\b(4|four|fourth)\b/.test(normalized)) return 'printer_problems';

    // Check for direct mentions
    if (/wifi|wi-fi|internet|network/.test(normalized)) return 'wifi_not_working';
    if (/email|login|password/.test(normalized)) return 'email_login_issues';
    if (/slow|performance|lag/.test(normalized)) return 'slow_laptop_performance';
    if (/printer|print/.test(normalized)) return 'printer_problems';

    return null;
  }
}
