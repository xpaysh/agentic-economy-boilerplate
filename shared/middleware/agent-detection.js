/**
 * Agent Detection Middleware
 *
 * Detects and classifies AI agents vs. human users based on various signals
 */

const logger = require('./logger');

/**
 * Known AI agent User-Agent patterns
 */
const AGENT_PATTERNS = [
  { pattern: /OpenAI/i, type: 'openai', score: 100 },
  { pattern: /Claude|Anthropic/i, type: 'anthropic', score: 100 },
  { pattern: /Google-Agent|Google Shopping/i, type: 'google', score: 100 },
  { pattern: /AI-Agent|Bot|Crawler/i, type: 'generic-bot', score: 90 },
  { pattern: /Autonomous|Agentic/i, type: 'autonomous', score: 85 },
  { pattern: /curl|wget|python-requests|axios/i, type: 'programmatic', score: 70 },
  { pattern: /Selenium|PhantomJS|Puppeteer/i, type: 'automated', score: 60 }
];

/**
 * Headers commonly used by AI agents
 */
const AGENT_HEADERS = [
  'x-agent-id',
  'x-agent-type',
  'x-agent-version',
  'x-ai-agent',
  'x-autonomous-agent',
  'x-bot-id',
  'x-client-type'
];

/**
 * Detect if request is from an AI agent
 */
function detectAgent(req, res, next) {
  const userAgent = req.get('user-agent') || '';
  const detectionResult = {
    isAgent: false,
    agentType: null,
    confidence: 0,
    signals: []
  };

  // Check User-Agent patterns
  for (const { pattern, type, score } of AGENT_PATTERNS) {
    if (pattern.test(userAgent)) {
      detectionResult.isAgent = true;
      detectionResult.agentType = type;
      detectionResult.confidence = Math.max(detectionResult.confidence, score);
      detectionResult.signals.push(`user-agent:${type}`);
    }
  }

  // Check for agent-specific headers
  for (const header of AGENT_HEADERS) {
    if (req.get(header)) {
      detectionResult.isAgent = true;
      detectionResult.confidence = Math.max(detectionResult.confidence, 80);
      detectionResult.signals.push(`header:${header}`);

      // Extract agent type from header if available
      if (header === 'x-agent-type' && !detectionResult.agentType) {
        detectionResult.agentType = req.get(header);
      }
    }
  }

  // Check for agent ID in any form
  const agentId = req.get('x-agent-id') || req.query.agentId || req.body?.agentId;
  if (agentId) {
    detectionResult.isAgent = true;
    detectionResult.confidence = Math.max(detectionResult.confidence, 90);
    detectionResult.signals.push('agent-id-present');
    req.agentId = agentId;
  }

  // Check for missing browser features (programmatic access)
  const acceptHeader = req.get('accept') || '';
  if (!acceptHeader.includes('text/html')) {
    detectionResult.confidence += 10;
    detectionResult.signals.push('no-html-accept');
  }

  // Check for missing common browser headers
  if (!req.get('accept-language')) {
    detectionResult.confidence += 5;
    detectionResult.signals.push('no-accept-language');
  }

  // Behavioral signals
  if (req.method === 'POST' && !req.get('referer')) {
    detectionResult.confidence += 5;
    detectionResult.signals.push('no-referer-on-post');
  }

  // Set default agent type if detected but type unknown
  if (detectionResult.isAgent && !detectionResult.agentType) {
    detectionResult.agentType = 'unknown-agent';
  }

  // Attach detection result to request
  req.isAgent = detectionResult.isAgent;
  req.agentType = detectionResult.agentType;
  req.agentConfidence = detectionResult.confidence;
  req.agentDetection = detectionResult;

  logger.debug('Agent detection:', {
    ip: req.ip,
    userAgent,
    isAgent: detectionResult.isAgent,
    type: detectionResult.agentType,
    confidence: detectionResult.confidence,
    signals: detectionResult.signals
  });

  next();
}

/**
 * Require request to be from an AI agent
 */
function requireAgent(options = {}) {
  const minConfidence = options.minConfidence || 70;

  return (req, res, next) => {
    if (!req.agentDetection) {
      // Detection middleware not run
      return res.status(500).json({
        error: 'Agent detection not initialized'
      });
    }

    if (!req.isAgent || req.agentConfidence < minConfidence) {
      logger.warn('Non-agent access attempt:', {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        confidence: req.agentConfidence
      });

      return res.status(403).json({
        error: 'This endpoint is only accessible by AI agents',
        isAgent: req.isAgent,
        confidence: req.agentConfidence,
        minimumConfidence: minConfidence
      });
    }

    next();
  };
}

/**
 * Require request to be from a human (not an agent)
 */
function requireHuman(options = {}) {
  const maxConfidence = options.maxConfidence || 50;

  return (req, res, next) => {
    if (!req.agentDetection) {
      return res.status(500).json({
        error: 'Agent detection not initialized'
      });
    }

    if (req.isAgent && req.agentConfidence > maxConfidence) {
      logger.warn('Agent access attempt on human-only endpoint:', {
        ip: req.ip,
        agentType: req.agentType,
        confidence: req.agentConfidence
      });

      return res.status(403).json({
        error: 'This endpoint is only accessible by human users'
      });
    }

    next();
  };
}

/**
 * Classify agent trust level based on various factors
 */
function classifyAgentTrust(req, res, next) {
  if (!req.isAgent) {
    req.agentTrustLevel = 'n/a';
    return next();
  }

  let trustScore = 50; // Start with neutral

  // Increase trust for known agent types
  const trustedTypes = ['openai', 'anthropic', 'google'];
  if (trustedTypes.includes(req.agentType)) {
    trustScore += 30;
  }

  // Increase trust if agent provides ID
  if (req.agentId) {
    trustScore += 10;
  }

  // Decrease trust for suspicious patterns
  const suspiciousTypes = ['generic-bot', 'automated'];
  if (suspiciousTypes.includes(req.agentType)) {
    trustScore -= 20;
  }

  // Decrease trust for missing expected headers
  if (!req.get('x-agent-version')) {
    trustScore -= 5;
  }

  // Classify based on score
  let trustLevel;
  if (trustScore >= 80) {
    trustLevel = 'high';
  } else if (trustScore >= 60) {
    trustLevel = 'medium';
  } else if (trustScore >= 40) {
    trustLevel = 'low';
  } else {
    trustLevel = 'suspicious';
  }

  req.agentTrustScore = trustScore;
  req.agentTrustLevel = trustLevel;

  logger.debug('Agent trust classification:', {
    agentId: req.agentId,
    agentType: req.agentType,
    trustScore,
    trustLevel
  });

  next();
}

/**
 * Require minimum agent trust level
 */
function requireTrustLevel(minLevel = 'medium') {
  const levels = {
    'suspicious': 0,
    'low': 1,
    'medium': 2,
    'high': 3
  };

  return (req, res, next) => {
    if (!req.agentTrustLevel) {
      return res.status(500).json({
        error: 'Agent trust classification not initialized'
      });
    }

    const requiredLevel = levels[minLevel];
    const currentLevel = levels[req.agentTrustLevel];

    if (currentLevel < requiredLevel) {
      logger.warn('Insufficient agent trust level:', {
        agentId: req.agentId,
        required: minLevel,
        current: req.agentTrustLevel,
        trustScore: req.agentTrustScore
      });

      return res.status(403).json({
        error: 'Insufficient trust level',
        required: minLevel,
        current: req.agentTrustLevel,
        trustScore: req.agentTrustScore
      });
    }

    next();
  };
}

/**
 * Extract agent metadata from request
 */
function extractAgentMetadata(req, res, next) {
  const metadata = {
    id: req.agentId || null,
    type: req.agentType || null,
    version: req.get('x-agent-version') || null,
    vendor: req.get('x-agent-vendor') || null,
    environment: req.get('x-agent-environment') || null,
    userAgent: req.get('user-agent') || null,
    ip: req.ip,
    timestamp: Date.now()
  };

  req.agentMetadata = metadata;
  next();
}

/**
 * Log agent activity for analytics
 */
function logAgentActivity(req, res, next) {
  // Capture response time
  const startTime = Date.now();

  // Hook into response finish event
  res.on('finish', () => {
    if (req.isAgent) {
      const duration = Date.now() - startTime;

      logger.info('Agent activity:', {
        agentId: req.agentId,
        agentType: req.agentType,
        trustLevel: req.agentTrustLevel,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        ip: req.ip
      });
    }
  });

  next();
}

/**
 * Complete agent detection middleware stack
 */
function agentMiddleware(options = {}) {
  return [
    detectAgent,
    classifyAgentTrust,
    extractAgentMetadata,
    ...(options.logActivity !== false ? [logAgentActivity] : [])
  ];
}

module.exports = {
  detectAgent,
  requireAgent,
  requireHuman,
  classifyAgentTrust,
  requireTrustLevel,
  extractAgentMetadata,
  logAgentActivity,
  agentMiddleware
};
