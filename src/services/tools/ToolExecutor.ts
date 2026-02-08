import { z } from 'zod';

import { CreateTicketInput, TicketRepository } from '../../data/repositories/TicketRepository.js';
import { IssueClassifier } from '../../domain/issue/IssueClassifier.js';
import { logger } from '../../utils/logger.js';
import {
  extractEmail,
  extractPhone,
  validateAddress,
  validateEmail,
  validateIssue,
  validateName,
  validatePhone,
} from '../../utils/validation.js';
import { ToolDefinition } from '../providers/types.js';

/**
 * Tool definitions and handlers for LLM function calling
 */

// =============================================================================
// Tool Schemas
// =============================================================================

export const createTicketSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  address: z.string().min(10),
  issue: z.string().min(5),
  issueType: z.string().optional(),
  price: z.number().positive(),
});

export const validateEmailSchema = z.object({
  email: z.string(),
});

export const validatePhoneSchema = z.object({
  phone: z.string(),
});

export const classifyIssueSchema = z.object({
  description: z.string(),
});

export const getPriceSchema = z.object({
  issueType: z.string(),
});

// =============================================================================
// Tool Definitions for LLM
// =============================================================================

export const toolDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'validate_email',
      description: 'Validate an email address format. Use this before storing email.',
      parameters: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            description: 'The email address to validate',
          },
        },
        required: ['email'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'validate_phone',
      description: 'Validate and format a phone number. Use this before storing phone.',
      parameters: {
        type: 'object',
        properties: {
          phone: {
            type: 'string',
            description: 'The phone number to validate',
          },
        },
        required: ['phone'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'classify_issue',
      description:
        'Classify the issue type from description to determine which IT service is needed. Returns issueType, price, and confidence level.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'The issue description provided by the user',
          },
        },
        required: ['description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_price_for_issue',
      description: 'Get the price for a specific issue type.',
      parameters: {
        type: 'object',
        properties: {
          issueType: {
            type: 'string',
            description:
              'The issue type (wifi_not_working, email_login_issues, slow_laptop_performance, printer_problems)',
          },
        },
        required: ['issueType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_ticket',
      description:
        'Create a support ticket with all collected information. Only call this after confirming all details with the user.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: "Customer's full name",
          },
          email: {
            type: 'string',
            description: "Customer's email address",
          },
          phone: {
            type: 'string',
            description: "Customer's phone number",
          },
          address: {
            type: 'string',
            description: "Customer's address",
          },
          issue: {
            type: 'string',
            description: 'Detailed issue description',
          },
          issueType: {
            type: 'string',
            description: 'Classified issue type',
          },
          price: {
            type: 'number',
            description: 'Service price',
          },
        },
        required: ['name', 'email', 'phone', 'address', 'issue', 'issueType', 'price'],
      },
    },
  },
];

// =============================================================================
// Tool Handlers
// =============================================================================

export class ToolExecutor {
  private ticketRepo: TicketRepository;
  private issueClassifier: IssueClassifier;

  constructor() {
    this.ticketRepo = new TicketRepository();
    this.issueClassifier = new IssueClassifier();
  }

  /**
   * Execute a tool by name with provided arguments
   */
  async execute(toolName: string, args: string): Promise<string> {
    logger.info({ toolName, args }, 'executing tool');

    try {
      switch (toolName) {
        case 'validate_email':
          return this.handleValidateEmail(args);

        case 'validate_phone':
          return this.handleValidatePhone(args);

        case 'classify_issue':
          return await this.handleClassifyIssue(args);

        case 'get_price_for_issue':
          return await this.handleGetPrice(args);

        case 'create_ticket':
          return await this.handleCreateTicket(args);

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      logger.error({ err: error, toolName }, 'tool execution failed');
      return JSON.stringify({ success: false, error: String(error) });
    }
  }

  /**
   * Validate email tool handler
   */
  private handleValidateEmail(args: string): string {
    const parsed = validateEmailSchema.parse(JSON.parse(args));
    const result = validateEmail(parsed.email);

    if (result.isValid) {
      // Also try to extract email if it's embedded in text
      const extracted = extractEmail(parsed.email) ?? result.sanitized;
      return JSON.stringify({
        success: true,
        isValid: true,
        email: extracted,
      });
    }

    return JSON.stringify({
      success: true,
      isValid: false,
      error: result.error,
    });
  }

  /**
   * Validate phone tool handler
   */
  private handleValidatePhone(args: string): string {
    const parsed = validatePhoneSchema.parse(JSON.parse(args));
    const result = validatePhone(parsed.phone);

    if (result.isValid) {
      // Also try to extract phone if it's embedded in text
      const extracted = extractPhone(parsed.phone) ?? result.sanitized;
      return JSON.stringify({
        success: true,
        isValid: true,
        phone: extracted,
      });
    }

    return JSON.stringify({
      success: true,
      isValid: false,
      error: result.error,
    });
  }

  /**
   * Classify issue tool handler
   */
  private async handleClassifyIssue(args: string): Promise<string> {
    const parsed = classifyIssueSchema.parse(JSON.parse(args));
    const result = await this.issueClassifier.classify(parsed.description);

    if (result.confidence === 'low' || result.method === 'clarification_needed') {
      return JSON.stringify({
        success: true,
        needsClarification: true,
        clarificationQuestion: this.issueClassifier.generateClarificationQuestion(
          parsed.description,
        ),
      });
    }

    return JSON.stringify({
      success: true,
      issueType: result.issueType,
      description: result.description,
      price: result.price,
      confidence: result.confidence,
    });
  }

  /**
   * Get price tool handler
   */
  private async handleGetPrice(args: string): Promise<string> {
    const parsed = getPriceSchema.parse(JSON.parse(args));
    const price = await this.ticketRepo['prisma'].serviceCatalog.findUnique({
      where: { issueType: parsed.issueType },
    });

    if (!price) {
      return JSON.stringify({ success: false, error: 'Issue type not found' });
    }

    return JSON.stringify({
      success: true,
      issueType: parsed.issueType,
      price: Number(price.price),
    });
  }

  /**
   * Create ticket tool handler
   */
  private async handleCreateTicket(args: string): Promise<string> {
    const parsed = createTicketSchema.parse(JSON.parse(args));

    // Validate all fields
    const nameValidation = validateName(parsed.name);
    const emailValidation = validateEmail(parsed.email);
    const phoneValidation = validatePhone(parsed.phone);
    const addressValidation = validateAddress(parsed.address);
    const issueValidation = validateIssue(parsed.issue);

    const errors: string[] = [];
    if (!nameValidation.isValid) errors.push(nameValidation.error!);
    if (!emailValidation.isValid) errors.push(emailValidation.error!);
    if (!phoneValidation.isValid) errors.push(phoneValidation.error!);
    if (!addressValidation.isValid) errors.push(addressValidation.error!);
    if (!issueValidation.isValid) errors.push(issueValidation.error!);

    if (errors.length > 0) {
      return JSON.stringify({ success: false, errors });
    }

    // Create ticket
    const ticketData: CreateTicketInput = {
      name: nameValidation.sanitized!,
      email: emailValidation.sanitized!,
      phone: phoneValidation.sanitized!,
      address: addressValidation.sanitized!,
      issue: issueValidation.sanitized!,
      issueType: parsed.issueType,
      price: parsed.price,
    };

    const ticket = await this.ticketRepo.createTicket(ticketData);

    return JSON.stringify({
      success: true,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      price: Number(ticket.price),
    });
  }
}
