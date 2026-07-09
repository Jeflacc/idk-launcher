/**
 * Crash Log Analyzer Feature
 * Parses crash logs and suggests fixes
 */

const COMMON_ERRORS = {
  'OutOfMemoryError': {
    title: 'Out of Memory',
    description: 'The game ran out of RAM',
    suggestions: [
      'Increase max memory in Settings (currently set in launcher)',
      'Close other applications to free up RAM',
      'Reduce render distance or view distance',
      'Disable heavy mods like shaders or performance-heavy content mods',
      'Try removing mods one by one to find the culprit'
    ]
  },
  'ClassNotFoundException': {
    title: 'Missing Class/Mod Dependency',
    description: 'A mod is missing a required dependency',
    suggestions: [
      'Check if all mod dependencies are installed',
      'Update mods to their latest versions',
      'Verify mod compatibility with your Minecraft version',
      'Check mod load order - some mods need to load before others'
    ]
  },
  'NoSuchMethodError': {
    title: 'Mod Compatibility Issue',
    description: 'A mod is calling a method that doesn\'t exist',
    suggestions: [
      'Update all mods to compatible versions',
      'Check for conflicting mods',
      'Try removing recently added mods',
      'Verify Fabric/Forge version compatibility'
    ]
  },
  'NullPointerException': {
    title: 'Null Pointer Exception',
    description: 'A mod tried to use a null value',
    suggestions: [
      'Update the problematic mod',
      'Check mod configuration files',
      'Try removing mods that modify game mechanics',
      'Report the issue to the mod author'
    ]
  },
  'DecoderException': {
    title: 'Network/Packet Error',
    description: 'Server sent malformed data',
    suggestions: [
      'This is usually a server-side issue',
      'Try connecting to a different server',
      'Update mods that handle networking',
      'Check if the server is up to date',
      'Report to the server admin'
    ]
  },
  'StackOverflowError': {
    title: 'Stack Overflow',
    description: 'Infinite recursion or too many nested calls',
    suggestions: [
      'Disable recently added mods',
      'Check for mod conflicts',
      'Update mods to latest versions',
      'Try removing mods that modify rendering'
    ]
  },
  'UnsupportedClassVersionError': {
    title: 'Java Version Mismatch',
    description: 'Mod compiled for different Java version',
    suggestions: [
      'Update Java to the latest version',
      'Check mod requirements for Java version',
      'Verify launcher is using correct Java path',
      'Try a different Java distribution (Adoptium, Temurin, etc.)'
    ]
  }
};

const MOD_SPECIFIC_ERRORS = {
  'sodium': {
    'GLException': 'Sodium (graphics mod) has GPU compatibility issues. Try updating or disabling it.',
    'OutOfMemoryError': 'Sodium may be using too much VRAM. Try lowering graphics settings.'
  },
  'optifine': {
    'ClassNotFoundException': 'OptiFine may be incompatible with your mods. Try using Sodium instead.',
    'NoSuchMethodError': 'OptiFine version mismatch. Update to latest version.'
  },
  'fabric': {
    'ClassNotFoundException': 'Missing Fabric API or mod dependency.',
    'NoSuchMethodError': 'Fabric API version mismatch.'
  }
};

/**
 * Parse crash log and extract error information
 */
export function parseCrashLog(crashLogText) {
  if (!crashLogText || typeof crashLogText !== 'string') {
    return { error: 'Invalid crash log format' };
  }

  const lines = crashLogText.split('\n');
  
  // Extract main exception
  let mainException = null;
  let exceptionMessage = null;
  let stackTrace = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for exception line
    if (line.includes('Exception') || line.includes('Error')) {
      const match = line.match(/(\w+(?:Exception|Error)):\s*(.*)/);
      if (match) {
        mainException = match[1];
        exceptionMessage = match[2];
        
        // Collect stack trace
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          if (lines[j].trim().startsWith('at ')) {
            stackTrace.push(lines[j].trim());
          }
        }
        break;
      }
    }
  }

  // Extract mods list if available
  const modsMatch = crashLogText.match(/Fabric Mods:(.+?)(?=\n\n|$)/s);
  const mods = modsMatch ? modsMatch[1].split('\n').filter(m => m.trim()) : [];

  return {
    mainException,
    exceptionMessage,
    stackTrace,
    mods,
    fullLog: crashLogText
  };
}

/**
 * Analyze crash log and provide suggestions
 */
export function analyzeCrash(crashLogText) {
  const parsed = parseCrashLog(crashLogText);
  
  if (!parsed.mainException) {
    return {
      error: 'Could not identify exception type',
      suggestions: [
        'Check the crash log for error details',
        'Look for "Exception" or "Error" in the log',
        'Try removing recently added mods'
      ]
    };
  }

  const errorInfo = COMMON_ERRORS[parsed.mainException] || {
    title: parsed.mainException,
    description: parsed.exceptionMessage || 'Unknown error',
    suggestions: ['Check mod compatibility', 'Update mods', 'Try removing recently added mods']
  };

  // Check for mod-specific issues
  let modSpecificAdvice = [];
  for (const mod of parsed.mods) {
    for (const [modName, errors] of Object.entries(MOD_SPECIFIC_ERRORS)) {
      if (mod.toLowerCase().includes(modName)) {
        const advice = errors[parsed.mainException];
        if (advice) modSpecificAdvice.push(`${modName}: ${advice}`);
      }
    }
  }

  return {
    exception: parsed.mainException,
    title: errorInfo.title,
    description: errorInfo.description,
    message: parsed.exceptionMessage,
    suggestions: errorInfo.suggestions,
    modSpecificAdvice,
    stackTrace: parsed.stackTrace.slice(0, 5),
    modsLoaded: parsed.mods.length,
    severity: calculateSeverity(parsed.mainException)
  };
}

/**
 * Calculate severity level of crash
 */
function calculateSeverity(exception) {
  const criticalErrors = ['OutOfMemoryError', 'StackOverflowError', 'UnsupportedClassVersionError'];
  const highErrors = ['ClassNotFoundException', 'NoSuchMethodError', 'NullPointerException'];
  
  if (criticalErrors.includes(exception)) return 'critical';
  if (highErrors.includes(exception)) return 'high';
  return 'medium';
}

/**
 * Format analysis for display
 */
export function formatAnalysis(analysis) {
  if (analysis.error) {
    return `<div class="crash-analysis-error">${analysis.error}</div>`;
  }

  const severityColor = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308'
  };

  let html = `
    <div class="crash-analysis" style="color: white;">
      <div style="margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: ${severityColor[analysis.severity]}; flex-shrink: 0;"></span>
          <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: white;">${analysis.title}</h3>
        </div>
        <p style="margin: 0; color: #a0a0a0; font-size: 13px;">${analysis.description}</p>
        ${analysis.message ? `<p style="margin: 8px 0 0 0; color: #d1d1d2; font-size: 12px; font-family: monospace; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">${analysis.message}</p>` : ''}
      </div>
      
      <div style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: var(--theme-accent); text-transform: uppercase; letter-spacing: 0.5px;">Suggestions</h4>
        <ul style="margin: 0; padding-left: 20px; list-style: none;">
          ${analysis.suggestions.map(s => `<li style="margin-bottom: 6px; color: #d1d1d2; font-size: 12px;">&bull; ${s}</li>`).join('')}
        </ul>
      </div>
      
      ${analysis.modSpecificAdvice.length > 0 ? `
        <div style="margin-bottom: 16px;">
          <h4 style="margin: 0 0 8px 0; font-size: 13px; font-weight: 600; color: #f97316; text-transform: uppercase; letter-spacing: 0.5px;">Mod-Specific Issues</h4>
          <ul style="margin: 0; padding-left: 20px; list-style: none;">
            ${analysis.modSpecificAdvice.map(a => `<li style="margin-bottom: 6px; color: #d1d1d2; font-size: 12px;">&bull; ${a}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      
      <div style="padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 11px; color: #707070;">
        ${analysis.modsLoaded} mods loaded | Exception: ${analysis.exception}
      </div>
    </div>
  `;

  return html;
}
