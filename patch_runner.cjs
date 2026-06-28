/**
 * InkOS 补丁脚本 (CommonJS)
 *
 * 功能1: 修复 resolveOverride - 当 modelOverride 有 service 字段但无 baseUrl 时，
 *        自动使用 service 对应的官方 API（baseUrl 从 service preset 自动解析）
 *        和密钥（从 .inkos/secrets.json 查找），而非回退到默认 yunwu client。
 *
 * 功能2: 模型黑名单 - 从 yunwu 的模型列表中过滤掉 deepseek/kimi/grok 系列模型，
 *        防止通过 yunwu 代理调用这些模型（应由官方 API 直接调用）。
 *
 * 用法（在 InkOS 容器内执行）：
 *   node /workspace/patch_runner.cjs
 */
const { readFileSync, writeFileSync, existsSync, readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');

const CORE_BASE = '/usr/local/lib/node_modules/@actalk/inkos/node_modules/@actalk/inkos-core/dist';
const INKOS_BASE = '/usr/local/lib/node_modules/@actalk/inkos';
const RUNNER_JS = join(CORE_BASE, 'pipeline', 'runner.js');
const PROJECT_JS = join(CORE_BASE, 'models', 'project.js');

console.log('=== InkOS 补丁脚本 ===\n');
console.log('功能1: resolveOverride 路由修复');
console.log('功能2: yunwu 模型黑名单 (deepseek/kimi/grok)\n');

// ========== 备份 ==========
function backup(filePath) {
  const bak = filePath + '.bak';
  if (!existsSync(bak)) {
    writeFileSync(bak, readFileSync(filePath, 'utf-8'), 'utf-8');
    console.log('[备份] ' + filePath + ' -> ' + bak);
  } else {
    console.log('[跳过备份] ' + bak + ' 已存在');
  }
}

// ========== 递归查找文件 ==========
function findFilesWithContent(dir, keyword, maxDepth, currentDepth) {
  if (maxDepth !== undefined && currentDepth > maxDepth) return [];
  var results = [];
  try {
    var entries = readdirSync(dir);
    for (var i = 0; i < entries.length; i++) {
      var fullPath = join(dir, entries[i]);
      try {
        var stat = statSync(fullPath);
        if (stat.isDirectory()) {
          // Skip node_modules to avoid deep recursion
          if (entries[i] === 'node_modules' && currentDepth > 1) continue;
          results = results.concat(findFilesWithContent(fullPath, keyword, maxDepth, (currentDepth || 0) + 1));
        } else if (entries[i].endsWith('.js')) {
          var content = readFileSync(fullPath, 'utf-8');
          if (content.includes(keyword)) {
            results.push(fullPath);
          }
        }
      } catch (e) {
        // skip
      }
    }
  } catch (e) {
    // skip
  }
  return results;
}

// ========== 1. 补丁 project.js ==========
function patchProject() {
  if (!existsSync(PROJECT_JS)) {
    console.log('[跳过] ' + PROJECT_JS + ' 不存在');
    return;
  }
  let code = readFileSync(PROJECT_JS, 'utf-8');

  const schemaIdx = code.indexOf('AgentLLMOverrideSchema');
  if (schemaIdx < 0) {
    console.log('[警告] project.js: 找不到 AgentLLMOverrideSchema');
    return;
  }

  const schemaBlock = code.substring(schemaIdx, schemaIdx + 500);
  if (schemaBlock.includes('service: z.string().optional()') || schemaBlock.includes('"service": z.string().optional()')) {
    console.log('[跳过] project.js: service 字段已存在');
    return;
  }

  const patterns = [
    [/(AgentLLMOverrideSchema\s*=\s*z\.object\(\s*\{[^}]*?model:\s*z\.string\(\)\.min\(1\),)\s*(provider:)/, '$1\n    service: z.string().optional(),\n  $2'],
    [/(AgentLLMOverrideSchema\s*=\s*z\.object\(\s*\{[^}]*?"model":\s*z\.string\(\)\.min\(1\),)\s*("provider":)/, '$1\n    "service": z.string().optional(),\n  $2'],
  ];

  let patched = false;
  for (const [pattern, replacement] of patterns) {
    if (pattern.test(code)) {
      code = code.replace(pattern, replacement);
      writeFileSync(PROJECT_JS, code, 'utf-8');
      console.log('[完成] project.js: AgentLLMOverrideSchema 添加 service 字段');
      patched = true;
      break;
    }
  }
  if (!patched) {
    console.log('[警告] project.js: 无法匹配模式，原始代码片段:');
    console.log('  ' + schemaBlock.substring(0, 200).replace(/\n/g, '\n  '));
  }
}

// ========== 2. 补丁 runner.js ==========
function patchRunner() {
  if (!existsSync(RUNNER_JS)) {
    console.log('[跳过] ' + RUNNER_JS + ' 不存在');
    return;
  }
  let code = readFileSync(RUNNER_JS, 'utf-8');

  if (code.includes('overrideService')) {
    console.log('[跳过] runner.js: 已有 resolveOverride 补丁');
    return;
  }

  // --- 2a. 添加 readFileSync import ---
  let importAdded = false;
  var fsImportMatch = code.match(/import\s*\{([^}]*)readFile([^}]*)\}\s*from\s*["']node:fs\/promises["']/);
  if (fsImportMatch) {
    if (!fsImportMatch[0].includes('readFileSync')) {
      code = code.replace(
        /import\s*\{([^}]*)\breadFile\b([^}]*)\}\s*from\s*["']node:fs\/promises["']/,
        'import { readFileSync$1readFile$2} from "node:fs";\nimport {$1readFile$2} from "node:fs/promises"'
      );
    }
    importAdded = true;
  }
  var fsRequireMatch = code.match(/(?:const|let|var)\s*\{([^}]*)readFile([^}]*)\}\s*=\s*require\(["']node:fs\/promises["']\)/);
  if (fsRequireMatch && !importAdded) {
    if (!fsRequireMatch[0].includes('readFileSync')) {
      code = code.replace(/\breadFile\b(?!,\s*readFileSync)/, 'readFileSync, readFile');
    }
    importAdded = true;
  }
  if (!importAdded) {
    code = "const { readFileSync } = require('node:fs');\n" + code;
    console.log('[完成] runner.js: 添加 readFileSync require');
  } else {
    console.log('[完成] runner.js: readFileSync 已在 import 中');
  }

  // --- 2b. 添加 serviceApiKeys 字段到构造函数 ---
  var ctorPattern = /constructor\s*\(\s*config\s*\)\s*\{/;
  var ctorMatch = code.match(ctorPattern);
  if (ctorMatch) {
    var ctorIdx = code.indexOf(ctorMatch[0]);
    var configAssignIdx = code.indexOf('this.config = config;', ctorIdx);
    if (configAssignIdx >= 0) {
      var insertPos = configAssignIdx + 'this.config = config;'.length;
      var initCode = '\n    this.serviceApiKeys = (config.serviceApiKeys) || PipelineRunner.loadServiceApiKeys(config.projectRoot);';
      code = code.substring(0, insertPos) + initCode + code.substring(insertPos);
      console.log('[完成] runner.js: 构造函数添加 serviceApiKeys');
    } else {
      console.log('[警告] runner.js: 找不到 this.config = config;');
    }
  } else {
    console.log('[警告] runner.js: 找不到 constructor(config)');
  }

  // --- 2c. 添加 loadServiceApiKeys 静态方法 ---
  var loadMethod = `
  static loadServiceApiKeys(projectRoot) {
    try {
      var p = require('node:path');
      var raw = readFileSync(p.join(projectRoot, '.inkos', 'secrets.json'), 'utf-8');
      var parsed = JSON.parse(raw);
      var result = {};
      if (parsed.services) {
        for (var key in parsed.services) {
          if (parsed.services[key] && parsed.services[key].apiKey) {
            result[key] = parsed.services[key].apiKey;
          }
        }
      }
      return result;
    } catch (e) {
      return {};
    }
  }`;

  var resolveIdx = code.indexOf('resolveOverride(');
  if (resolveIdx >= 0) {
    var insertPos2 = resolveIdx;
    while (insertPos2 > 0 && /\s/.test(code[insertPos2 - 1])) insertPos2--;
    code = code.substring(0, insertPos2) + loadMethod + '\n\n  ' + code.substring(insertPos2);
    console.log('[完成] runner.js: 添加 loadServiceApiKeys 方法');
  }

  // --- 2d. 替换 resolveOverride 方法 ---
  var newMethod = `resolveOverride(agentName) {
    var override = this.config.modelOverrides && this.config.modelOverrides[agentName];
    if (!override) {
      return { model: this.config.model, client: this.config.client };
    }
    if (typeof override === "string") {
      return { model: override, client: this.config.client };
    }
    var base = this.config.defaultLLMConfig;
    var overrideService = override.service;
    var explicitBaseUrl = override.baseUrl || "";

    if (!explicitBaseUrl && (!overrideService || overrideService === (base && base.service))) {
      return { model: override.model, client: this.config.client };
    }

    var serviceForClient = overrideService || (base && base.service) || "custom";

    var apiKey = "";
    if (override.apiKeyEnv) {
      apiKey = process.env[override.apiKeyEnv] || "";
    }
    if (!apiKey && overrideService) {
      apiKey = this.serviceApiKeys[overrideService] || "";
    }
    if (!apiKey) {
      apiKey = (base && base.apiKey) || "";
    }

    var provider = override.provider || (base && base.provider) || "custom";
    var apiKeySource = override.apiKeyEnv
      ? "env:" + override.apiKeyEnv
      : overrideService
        ? "svc:" + overrideService
        : "base:" + ((base && base.apiKey) || "");
    var stream = override.stream !== undefined ? override.stream : (base && base.stream !== undefined ? base.stream : true);
    var apiFormat = (base && base.apiFormat) || "chat";
    var cacheKey = [provider, serviceForClient, explicitBaseUrl, apiKeySource, "stream:" + stream, "format:" + apiFormat].join("|");
    var client = this.agentClients.get(cacheKey);
    if (!client) {
      client = createLLMClient({
        provider: provider,
        service: serviceForClient,
        configSource: (base && base.configSource) || "env",
        baseUrl: explicitBaseUrl,
        apiKey: apiKey,
        model: override.model,
        temperature: (base && base.temperature) || 0.7,
        thinkingBudget: (base && base.thinkingBudget) || 0,
        apiFormat: apiFormat,
        stream: stream,
      });
      this.agentClients.set(cacheKey, client);
    }
    return { model: override.model, client: client };
  }`;

  var oldStart = code.indexOf('resolveOverride(');
  if (oldStart >= 0) {
    var methodStart = oldStart;
    while (methodStart > 0 && /\s/.test(code[methodStart - 1])) methodStart--;

    var braceStart = code.indexOf('{', oldStart);
    if (braceStart >= 0) {
      var depth = 1;
      var pos = braceStart + 1;
      while (pos < code.length && depth > 0) {
        if (code[pos] === '{') depth++;
        else if (code[pos] === '}') depth--;
        pos++;
      }
      code = code.substring(0, methodStart) + newMethod + code.substring(pos - 1);
      writeFileSync(RUNNER_JS, code, 'utf-8');
      console.log('[完成] runner.js: resolveOverride 方法已替换');
    } else {
      console.log('[警告] runner.js: 无法找到 resolveOverride 的起始大括号');
    }
  } else {
    console.log('[警告] runner.js: 无法找到 resolveOverride 方法');
  }
}

// ========== 3. 补丁服务器：模型黑名单 ==========
function patchServerModelBlacklist() {
  console.log('\n--- 模型黑名单补丁 ---');

  // 在 InkOS 主包和 core 包中搜索包含 filterTextChatModels 的 JS 文件
  var searchDirs = [
    join(INKOS_BASE, 'dist'),
    INKOS_BASE,
    join(INKOS_BASE, 'node_modules', '@actalk', 'inkos-core', 'dist'),
  ];

  var serverFile = null;

  for (var i = 0; i < searchDirs.length; i++) {
    if (!existsSync(searchDirs[i])) continue;
    console.log('[搜索] ' + searchDirs[i]);
    var files = findFilesWithContent(searchDirs[i], 'filterTextChatModels', 3, 0);
    for (var j = 0; j < files.length; j++) {
      var content = readFileSync(files[j], 'utf-8');
      // 确认这个文件同时包含模型列表路由和 filterTextChatModels 调用
      if (content.includes('filterTextChatModels') && content.includes('.map(')) {
        serverFile = files[j];
        break;
      }
    }
    if (serverFile) break;
  }

  if (!serverFile) {
    console.log('[跳过] 未找到包含 filterTextChatModels 的服务器文件');
    return;
  }

  console.log('[找到] 服务器文件: ' + serverFile);

  var code = readFileSync(serverFile, 'utf-8');

  // 检查是否已打补丁
  if (code.includes('__MODEL_BLACKLIST__')) {
    console.log('[跳过] 服务器文件已有模型黑名单补丁');
    return;
  }

  // 备份
  backup(serverFile);

  // 查找 filterTextChatModels(...).map( 并在 .map 前插入 .filter(...)
  // 黑名单模型前缀: deepseek, kimi, grok
  var blacklistFilter = '.filter(function(m){return!/^(deepseek|kimi|grok)/i.test(m.id||m.name||"")})';

  // 多种可能的模式
  var patterns = [
    // filterTextChatModels(xxx).map(
    /(\bfilterTextChatModels\([^)]+\))(\.map\()/,
    // filterTextChatModels(xxx) .map(
    /(\bfilterTextChatModels\([^)]+\))(\s*\.\s*map\s*\()/,
  ];

  var patched = false;
  for (var k = 0; k < patterns.length; k++) {
    var pattern = patterns[k];
    if (pattern.test(code)) {
      code = code.replace(pattern, '$1' + blacklistFilter + '$2');
      // 添加标记
      code = code.replace(
        'filterTextChatModels',
        '/*__MODEL_BLACKLIST__*/filterTextChatModels'
      );
      writeFileSync(serverFile, code, 'utf-8');
      console.log('[完成] 服务器文件: 添加模型黑名单过滤器');
      console.log('  过滤规则: 排除 id/name 以 deepseek/kimi/grok 开头的模型');
      patched = true;
      break;
    }
  }

  if (!patched) {
    // 尝试另一种方式：在 return c.json({ models }) 前添加过滤
    var jsonPattern = /return\s+\w+\.json\(\s*\{\s*models\s*\}\s*\)/;
    if (jsonPattern.test(code)) {
      code = code.replace(
        jsonPattern,
        'models = models.filter(function(m){return!/^(deepseek|kimi|grok)/i.test(m.id||m.name||"")});\n    return c.json({ models })'
      );
      code = code.replace(
        'filterTextChatModels',
        '/*__MODEL_BLACKLIST__*/filterTextChatModels'
      );
      writeFileSync(serverFile, code, 'utf-8');
      console.log('[完成] 服务器文件: 添加模型黑名单过滤器 (通过 return 过滤)');
      patched = true;
    }
  }

  if (!patched) {
    console.log('[警告] 服务器文件: 无法匹配过滤模式');
    console.log('  手动过滤说明: 在 filterTextChatModels(enriched).map(...) 前添加:');
    console.log('  .filter(m => !/^(deepseek|kimi|grok)/i.test(m.id || m.name || ""))');
  }
}

// ========== 执行 ==========
try {
  // 功能1: 路由修复
  console.log('--- 路由修复 ---');
  if (existsSync(RUNNER_JS)) {
    backup(RUNNER_JS);
  }
  if (existsSync(PROJECT_JS)) {
    backup(PROJECT_JS);
  }
  console.log('');
  patchProject();
  patchRunner();

  // 功能2: 模型黑名单
  patchServerModelBlacklist();

  console.log('\n=== 补丁完成 ===');
  console.log('请重启 InkOS 容器使补丁生效：');
  console.log('  docker restart inkos');
  console.log('');
  console.log('如需回滚：');
  console.log('  docker exec inkos sh -c "cp ' + RUNNER_JS + '.bak ' + RUNNER_JS + ' && cp ' + PROJECT_JS + '.bak ' + PROJECT_JS + '"');
  console.log('  docker restart inkos');
} catch (err) {
  console.error('补丁失败:', err.message);
  console.error(err.stack);
  console.error('请使用 .bak 文件回滚');
  process.exit(1);
}
