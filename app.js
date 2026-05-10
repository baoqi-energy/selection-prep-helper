// ==================== 全局变量 ====================
let currentMindmapData = null;
let currentEssayData = null;
let currentPolicyData = null;

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 宝子的备考助手启动！');
    initNavigation();
    initMindmapModule();
    initEssayModule();
    initPolicyModule();
    initTodoModule();
    initHelpModal();
    initDataManagement();
    loadAllData();
});

// ==================== 导航功能 ====================
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            navBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const moduleId = this.dataset.module + '-module';
            document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
            document.getElementById(moduleId).classList.add('active');
        });
    });
}

// ==================== 帮助模态框 ====================
function initHelpModal() {
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelpBtn = document.getElementById('close-help-modal');

    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            helpModal.style.display = 'flex';
        });
    }

    if (closeHelpBtn) {
        closeHelpBtn.addEventListener('click', () => {
            helpModal.style.display = 'none';
        });
    }

    // 点击模态框外部关闭
    if (helpModal) {
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) {
                helpModal.style.display = 'none';
            }
        });
    }
}

// ==================== 加载所有数据 ====================
function loadAllData() {
    loadMindmaps();
    loadEssays();
    loadPolicies();
    loadTodos();
}

// ==================== 思维导图模块 ====================
function initMindmapModule() {
    // 新建思维导图按钮
    const newBtn = document.getElementById('new-mindmap-btn');
    const modal = document.getElementById('mindmap-modal');
    const closeBtn = document.getElementById('close-mindmap-modal');

    if (newBtn) {
        newBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            resetMindmapModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // 点击模态框外部关闭
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // 标签页切换
    initMindmapTabs();

    // 文件上传
    initMindmapFileUpload();

    // 按钮事件
    initMindmapButtons();

    // 搜索功能
    const searchInput = document.getElementById('mindmap-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterMindmaps);
    }
}

function initMindmapTabs() {
    const tabBtns = document.querySelectorAll('#mindmap-modal .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.dataset.tab + '-tab';

            this.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const tabContent = this.closest('.step-content').querySelectorAll('.tab-content');
            tabContent.forEach(t => t.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function initMindmapFileUpload() {
    const fileInput = document.getElementById('mm-file-input');
    const dropArea = document.getElementById('mm-file-drop-area');

    if (dropArea) {
        dropArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });

        dropArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
        });

        dropArea.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');

            const files = e.dataTransfer.files;
            handleMindmapFiles(files);
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', function() {
            handleMindmapFiles(this.files);
        });
    }
}

function handleMindmapFiles(files) {
    if (files.length === 0) return;

    const file = files[0];

    if (file.name.endsWith('.txt')) {
        // 处理TXT文件
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('mm-content-input').value = e.target.result;
            document.querySelector('#mindmap-modal [data-tab="mm-paste"]').click();
        };
        reader.readAsText(file, 'UTF-8');

    } else if (file.name.endsWith('.pdf')) {
        // 处理PDF文件
        parsePDFFile(file);

    } else {
        alert('⚠️ 暂不支持 ' + file.name + ' 的格式。请上传 .txt 或 .pdf 文件。');
    }
}

function parsePDFFile(file) {
    const fileReader = new FileReader();

    fileReader.onload = function() {
        const typedarray = new Uint8Array(this.result);

        // 使用 pdf.js 解析 PDF
        pdfjsLib.getDocument(typedarray).promise.then(function(pdf) {
            let totalText = '';
            let pagePromises = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                pagePromises.push(
                    pdf.getPage(i).then(function(page) {
                        return page.getTextContent().then(function(textContent) {
                            return textContent.items.map(item => item.str).join(' ');
                        });
                    })
                );
            }

            Promise.all(pagePromises).then(function(pagesText) {
                totalText = pagesText.join('\n\n');

                document.getElementById('mm-content-input').value = totalText;
                document.querySelector('#mindmap-modal [data-tab="mm-paste"]').click();

                alert('✅ PDF解析成功！共 ' + pdf.numPages + ' 页\n\n即将自动生成AI提示词...');

                // 自动生成AI提示词并跳转到第二步
                generateMindmapPromptAuto();
            });

        }).catch(function(error) {
            alert('❌ PDF解析失败：' + error.message);
        });
    };

    fileReader.readAsArrayBuffer(file);
}

// 自动生成提示词（不alert，直接跳转）
function generateMindmapPromptAuto() {
    const content = document.getElementById('mm-content-input').value.trim();

    if (!content) {
        alert('⚠️ 请先输入或上传讲义内容');
        return;
    }

    const prompt = `请分析以下公文讲义内容，生成结构化的思维导图JSON数据。

要求：
1. 识别公文文种（如通知、报告、请示、批复、函、纪要等）
2. 提取每个文种的核心要素，包括：
   ● 适用场景
   ● 结构框架
   ● 写作要点
   ● 常见错误
   ● 高分技巧
3. 返回严格的JSON格式，结构如下：
{
  "name": "公文写作",
  "children": [
    {
      "name": "公文文种名称",
      "children": [
        {"name": "适用场景", "content": "详细描述..."},
        {"name": "结构框架", "content": "详细描述..."},
        {"name": "写作要点", "content": "详细描述..."},
        {"name": "常见错误", "content": "详细描述..."},
        {"name": "高分技巧", "content": "详细描述..."}
      ]
    }
  ]
}

注意：
- content字段要详细、实用，适合备考背诵
- 如果是多种公文，每个公文作为一个子节点
- 只返回JSON，不要有其他文字

讲义内容：
---
${content}
---

请返回JSON数据：`;

    document.getElementById('mm-prompt-output').value = prompt;

    // 切换到步骤2
    switchMindmapStep(2);

    // 自动复制提示词到剪贴板
    navigator.clipboard.writeText(prompt).then(() => {
        // 视觉反馈：高亮提示区域
        const hint = document.querySelector('.step2-hint');
        if (hint) {
            hint.style.background = 'linear-gradient(135deg, var(--mint-pale), var(--sky-pale))';
            hint.style.borderColor = 'var(--mint-green)';
            hint.innerHTML = '<i class="fas fa-check-circle"></i> ✅ 提示词已自动复制到剪贴板！请粘贴到AI对话框，等待AI返回JSON结果后再进行下一步。';
        }
        alert('✅ 提示词已自动复制！\n\n请直接粘贴到AI对话框进行分析。');
    }).catch(() => {
        // 如果clipboard API失败，使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = prompt;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        const hint = document.querySelector('.step2-hint');
        if (hint) {
            hint.style.background = 'linear-gradient(135deg, var(--mint-pale), var(--sky-pale))';
            hint.style.borderColor = 'var(--mint-green)';
            hint.innerHTML = '<i class="fas fa-check-circle"></i> ✅ 提示词已自动复制到剪贴板！请粘贴到AI对话框，等待AI返回JSON结果后再进行下一步。';
        }
        alert('✅ 提示词已自动复制！\n\n请直接粘贴到AI对话框进行分析。');
    });
}

function initMindmapButtons() {
    // 生成AI提示词
    const generateBtn = document.getElementById('mm-generate-prompt-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateMindmapPrompt);
    }

    // 复制提示词
    const copyBtn = document.getElementById('mm-copy-prompt-btn');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyMindmapPrompt);
    }

    // 加载思维导图
    const loadBtn = document.getElementById('mm-load-mindmap-btn');
    if (loadBtn) {
        loadBtn.addEventListener('click', loadMindmapFromAI);
    }

    // 保存思维导图
    const saveBtn = document.getElementById('mm-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveMindmap);
    }

    // 返回列表
    const backBtn = document.getElementById('back-to-list');
    if (backBtn) {
        backBtn.addEventListener('click', showMindmapList);
    }

    // 展开/折叠
    const expandBtn = document.getElementById('expand-all-btn');
    if (expandBtn) {
        expandBtn.addEventListener('click', expandAllMindmapNodes);
    }

    const collapseBtn = document.getElementById('collapse-all-btn');
    if (collapseBtn) {
        collapseBtn.addEventListener('click', collapseAllMindmapNodes);
    }

    // 导出
    const exportBtn = document.getElementById('export-mindmap-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportMindmap);
    }

    // 删除
    const deleteBtn = document.getElementById('delete-mindmap-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteMindmap);
    }
}

function generateMindmapPrompt() {
    const content = document.getElementById('mm-content-input').value.trim();

    if (!content) {
        alert('⚠️ 请先输入或上传讲义内容');
        return;
    }

    const prompt = `请分析以下公文讲义内容，生成结构化的思维导图JSON数据。

要求：
1. 识别公文文种（如通知、报告、请示、批复、函、纪要等）
2. 提取每个文种的核心要素，包括：
   ○ 适用场景
   ● 结构框架
   □ 写作要点
   ○ 常见错误
   ● 高分技巧
3. 返回严格的JSON格式，结构如下：
{
  "name": "公文写作",
  "children": [
    {
      "name": "公文文种名称",
      "children": [
        {"name": "适用场景", "content": "详细描述..."},
        {"name": "结构框架", "content": "详细描述..."},
        {"name": "写作要点", "content": "详细描述..."},
        {"name": "常见错误", "content": "详细描述..."},
        {"name": "高分技巧", "content": "详细描述..."}
      ]
    }
  ]
}

注意：
- content字段要详细、实用，适合备考背诵
- 如果是多种公文，每个公文作为一个子节点
- 只返回JSON，不要有其他文字

讲义内容：
---
${content}
---

请返回JSON数据：`;

    document.getElementById('mm-prompt-output').value = prompt;

    // 切换到步骤2
    switchMindmapStep(2);

    alert('✅ 提示词已生成！\n\n请复制提示词，发送给AI分析。');
}

function copyMindmapPrompt() {
    const promptText = document.getElementById('mm-prompt-output');

    if (!promptText.value) {
        alert('⚠️ 提示词为空，请先生成提示词');
        return;
    }

    promptText.select();
    document.execCommand('copy');

    alert('✅ 提示词已复制到剪贴板！\n\n请粘贴到AI对话框进行分析。');
}

function loadMindmapFromAI() {
    const jsonText = document.getElementById('mm-ai-response-input').value.trim();

    if (!jsonText) {
        alert('⚠️ 请先粘贴AI返回的结构化数据');
        return;
    }

    try {
        const data = JSON.parse(jsonText);
        currentMindmapData = data;

        // 预览
        const preview = document.getElementById('mm-preview');
        preview.innerHTML = '';
        const summary = document.createElement('p');
        summary.textContent = `✅ 成功解析！包含 ${data.children ? data.children.length : 0} 个主要节点。`;
        summary.style.padding = '15px';
        summary.style.background = '#d4edda';
        summary.style.borderRadius = '8px';
        summary.style.color = '#155724';
        preview.appendChild(summary);

        // 切换到步骤3
        switchMindmapStep(3);

        alert('✅ 思维导图数据加载成功！\n\n请为思维导图命名并保存。');
    } catch (e) {
        alert('❌ JSON格式错误，请检查AI返回的数据：\n\n' + e.message);
    }
}

function switchMindmapStep(stepNum) {
    // 更新步骤指示器
    const dots = document.querySelectorAll('.step-dot');
    dots.forEach((dot, index) => {
        if (index < stepNum) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    // 显示对应步骤内容
    const steps = document.querySelectorAll('.step-content');
    steps.forEach((step, index) => {
        if (index === stepNum - 1) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

function resetMindmapModal() {
    switchMindmapStep(1);
    document.getElementById('mm-content-input').value = '';
    document.getElementById('mm-prompt-output').value = '';
    document.getElementById('mm-ai-response-input').value = '';
    document.getElementById('mm-name-input').value = '';
    document.getElementById('mm-preview').innerHTML = '';
}

function saveMindmap() {
    if (!currentMindmapData) {
        alert('⚠️ 没有可保存的思维导图数据');
        return;
    }

    const name = document.getElementById('mm-name-input').value.trim();
    if (!name) {
        alert('⚠️ 请输入思维导图名称');
        return;
    }

    const saved = JSON.parse(localStorage.getItem('mindmaps') || '[]');

    saved.push({
        id: Date.now(),
        name: name,
        data: currentMindmapData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });

    localStorage.setItem('mindmaps', JSON.stringify(saved));

    alert('✅ 思维导图保存成功！');

    document.getElementById('mindmap-modal').style.display = 'none';
    loadMindmaps();
}

function loadMindmaps() {
    const saved = JSON.parse(localStorage.getItem('mindmaps') || '[]');
    const list = document.getElementById('mindmap-list');

    if (saved.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>还没有思维导图</p>
                <p class="hint">点击「新建」开始创建</p>
            </div>
        `;
        return;
    }

    list.innerHTML = '';
    saved.forEach((mindmap, index) => {
        const card = document.createElement('div');
        card.className = 'mindmap-card slide-in';
        card.style.animationDelay = (index * 0.1) + 's';

        const date = new Date(mindmap.updatedAt).toLocaleDateString('zh-CN');
        const nodeCount = mindmap.data.children ? mindmap.data.children.length : 0;

        card.innerHTML = `
            <h4>${escapeHtml(mindmap.name)}</h4>
            <p>📊 ${nodeCount} 个主要节点</p>
            <p class="card-date">🕒 ${date}</p>
        `;

        card.onclick = () => viewMindmap(mindmap.id);

        list.appendChild(card);
    });
}

function viewMindmap(id) {
    const saved = JSON.parse(localStorage.getItem('mindmaps') || '[]');
    const mindmap = saved.find(m => m.id === id);

    if (!mindmap) {
        alert('❌ 思维导图不存在');
        return;
    }

    currentMindmapData = mindmap.data;

    // 隐藏列表，显示查看器
    document.getElementById('mindmap-list').style.display = 'none';
    document.getElementById('mindmap-viewer').style.display = 'block';

    // 设置标题
    document.getElementById('viewer-title').textContent = mindmap.name;

    // 渲染思维导图
    renderMindmap(mindmap.data);
}

function showMindmapList() {
    document.getElementById('mindmap-list').style.display = 'grid';
    document.getElementById('mindmap-viewer').style.display = 'none';
    currentMindmapData = null;
}

function renderMindmap(data) {
    const container = document.getElementById('mindmap-display');
    container.innerHTML = '';

    const tree = createMindmapNode(data, 0);
    container.appendChild(tree);
}

function createMindmapNode(nodeData, level) {
    const node = document.createElement('div');
    node.className = 'mindmap-node';

    // 节点内容
    const content = document.createElement('div');
    content.className = 'mindmap-node-content level-' + Math.min(level, 3);

    // 如果有子节点，添加展开/折叠按钮
    if (nodeData.children && nodeData.children.length > 0) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.textContent = '▼';
        toggleBtn.onclick = function(e) {
            e.stopPropagation();
            toggleMindmapNode(this);
        };
        content.appendChild(toggleBtn);
    }

    // 节点文本
    const text = document.createElement('span');
    text.textContent = nodeData.name;
    content.appendChild(text);

    // 如果有content字段，添加点击显示功能
    if (nodeData.content) {
        content.onclick = function(e) {
            if (e.target.classList.contains('toggle-btn')) return;
            showNodeContent(nodeData);
        };
        content.style.cursor = 'pointer';
    }

    node.appendChild(content);

    // 子节点
    if (nodeData.children && nodeData.children.length > 0) {
        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'mindmap-node-children';

        nodeData.children.forEach(child => {
            const childNode = createMindmapNode(child, level + 1);
            childrenContainer.appendChild(childNode);
        });

        node.appendChild(childrenContainer);
    }

    return node;
}

function toggleMindmapNode(btn) {
    const childrenContainer = btn.parentElement.parentElement.querySelector('.mindmap-node-children');

    if (childrenContainer.classList.contains('collapsed')) {
        childrenContainer.classList.remove('collapsed');
        btn.textContent = '▼';
    } else {
        childrenContainer.classList.add('collapsed');
        btn.textContent = '▶';
    }
}

function showNodeContent(nodeData) {
    if (!nodeData.content) return;

    alert(`📝 ${nodeData.name}\n\n${nodeData.content}`);
}

function expandAllMindmapNodes() {
    const collapsedContainers = document.querySelectorAll('.mindmap-node-children.collapsed');
    const toggleBtns = document.querySelectorAll('.toggle-btn');

    collapsedContainers.forEach(container => {
        container.classList.remove('collapsed');
    });

    toggleBtns.forEach(btn => {
        btn.textContent = '▼';
    });
}

function collapseAllMindmapNodes() {
    const allContainers = document.querySelectorAll('.mindmap-node-children');
    const toggleBtns = document.querySelectorAll('.toggle-btn');

    allContainers.forEach(container => {
        container.classList.add('collapsed');
    });

    toggleBtns.forEach(btn => {
        btn.textContent = '▶';
    });
}

function exportMindmap() {
    if (!currentMindmapData) {
        alert('⚠️ 没有可导出的思维导图');
        return;
    }

    const jsonStr = JSON.stringify(currentMindmapData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = (currentMindmapData.name || '思维导图') + '.json';
    a.click();

    URL.revokeObjectURL(url);
    alert('✅ 思维导图已导出为JSON文件！');
}

function deleteMindmap() {
    if (!currentMindmapData) {
        alert('⚠️ 没有可删除的思维导图');
        return;
    }

    const name = document.getElementById('viewer-title').textContent;

    if (!confirm(`确定要删除思维导图「${name}」吗？`)) {
        return;
    }

    const saved = JSON.parse(localStorage.getItem('mindmaps') || '[]');
    const newSaved = saved.filter(m => m.name !== name);

    localStorage.setItem('mindmaps', JSON.stringify(newSaved));

    alert('✅ 思维导图已删除！');
    showMindmapList();
    loadMindmaps();
}

function filterMindmaps() {
    const keyword = document.getElementById('mindmap-search').value.toLowerCase();
    const cards = document.querySelectorAll('.mindmap-card');

    cards.forEach(card => {
        const title = card.querySelector('h4').textContent.toLowerCase();
        if (title.includes(keyword)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ==================== 工具函数 ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 待实现功能提示 ====================
console.log('📝 提示：范文库和政策文件模块的功能正在开发中...');
console.log('💪 宝子加油！遴选大神就是你啦~');

// ==================== 范文库模块 ====================
function initEssayModule() {
    const uploadBtn = document.getElementById('upload-essay-btn');
    const modal = document.getElementById('essay-modal');
    const closeBtn = document.getElementById('close-essay-modal');

    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            resetEssayModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // AI分析按钮
    const analyzeBtn = document.getElementById('essay-ai-analyze-btn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeEssay);
    }

    // 保存按钮
    const saveBtn = document.getElementById('essay-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveEssay);
    }

    // 返回列表
    const backBtn = document.getElementById('back-to-essay-list');
    if (backBtn) {
        backBtn.addEventListener('click', showEssayList);
    }

    // 搜索功能
    const searchInput = document.getElementById('essay-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterEssays);
    }

    // 分类筛选
    const categoryFilter = document.getElementById('essay-category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterEssays);
    }
}

function resetEssayModal() {
    document.getElementById('essay-title-input').value = '';
    document.getElementById('essay-type-input').value = '通知';
    document.getElementById('essay-content-input').value = '';
    document.getElementById('essay-keywords-input').value = '';
}

function analyzeEssay() {
    const content = document.getElementById('essay-content-input').value.trim();

    if (!content) {
        alert('⚠️ 请先输入或粘贴范文内容');
        return;
    }

    const prompt = `请分析以下范文，提炼重点内容。

要求：
1. 识别公文类型
2. 提炼核心观点（3-5个）
3. 标注关键词（5-10个）
4. 分析写作结构
5. 指出高分亮点

返回JSON格式：
{
  "type": "公文类型",
  "coreViews": ["观点1", "观点2", ...],
  "keywords": ["关键词1", "关键词2", ...],
  "structure": "结构分析",
  "highlights": ["亮点1", "亮点2", ...]
}

范文内容：
---
${content}
---

请返回JSON数据：`;

    // 复制到剪贴板
    navigator.clipboard.writeText(prompt).then(() => {
        alert('✅ AI分析提示词已复制到剪贴板！\n\n请粘贴到AI对话框进行分析，然后将返回的JSON粘贴回来。');
    }).catch(() => {
        // 如果clipboard API失败，使用传统方法
        const textArea = document.createElement('textarea');
        textArea.value = prompt;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('✅ AI分析提示词已复制到剪贴板！\n\n请粘贴到AI对话框进行分析，然后将返回的JSON粘贴回来。');
    });

    // 这里应该有个地方让用户粘贴AI返回的结果
    // 为了简化，我们直接让用户在保存时手动输入关键词
    alert('💡 提示：AI分析完成后，请手动将关键词填写到「关键词」输入框中。');
}

function saveEssay() {
    const title = document.getElementById('essay-title-input').value.trim();
    const type = document.getElementById('essay-type-input').value;
    const content = document.getElementById('essay-content-input').value.trim();
    const keywords = document.getElementById('essay-keywords-input').value.trim();

    if (!title || !content) {
        alert('⚠️ 请填写标题和内容');
        return;
    }

    const keywordArray = keywords ? keywords.split(/[,，]/).map(k => k.trim()).filter(k => k) : [];

    const essays = JSON.parse(localStorage.getItem('essays') || '[]');

    essays.push({
        id: Date.now(),
        title: title,
        type: type,
        content: content,
        keywords: keywordArray,
        createdAt: new Date().toISOString()
    });

    localStorage.setItem('essays', JSON.stringify(essays));

    alert('✅ 范文保存成功！');

    document.getElementById('essay-modal').style.display = 'none';
    loadEssays();
}

function loadEssays() {
    const saved = JSON.parse(localStorage.getItem('essays') || '[]');
    const list = document.getElementById('essay-list');

    if (saved.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📄</span>
                <p>还没有范文</p>
                <p class="hint">点击「上传范文」开始添加</p>
            </div>
        `;
        return;
    }

    list.innerHTML = '';
    saved.forEach((essay, index) => {
        const card = document.createElement('div');
        card.className = 'essay-card slide-in';
        card.style.animationDelay = (index * 0.1) + 's';

        const keywordsHtml = essay.keywords && essay.keywords.length > 0
            ? essay.keywords.map(k => `<span class="keyword-tag">${escapeHtml(k)}</span>`).join('')
            : '';

        card.innerHTML = `
            <span class="essay-type">${escapeHtml(essay.type)}</span>
            <h4>${escapeHtml(essay.title)}</h4>
            <p>📝 ${essay.content.length} 字</p>
            ${keywordsHtml ? '<div class="essay-keywords">' + keywordsHtml + '</div>' : ''}
        `;

        card.onclick = () => viewEssay(essay.id);

        list.appendChild(card);
    });
}

function viewEssay(id) {
    const saved = JSON.parse(localStorage.getItem('essays') || '[]');
    const essay = saved.find(e => e.id === id);

    if (!essay) {
        alert('❌ 范文不存在');
        return;
    }

    currentEssayData = essay;

    // 隐藏列表，显示查看器
    document.getElementById('essay-list').style.display = 'none';
    document.getElementById('essay-viewer').style.display = 'block';

    // 设置标题
    document.getElementById('essay-viewer-title').textContent = essay.title;

    // 显示内容（高亮关键词）
    const contentDiv = document.getElementById('essay-viewer-content');
    let htmlContent = escapeHtml(essay.content);

    // 高亮关键词
    if (essay.keywords && essay.keywords.length > 0) {
        essay.keywords.forEach(keyword => {
            const regex = new RegExp(escapeRegExp(keyword), 'gi');
            htmlContent = htmlContent.replace(regex, '<span class="highlight-yellow">' + keyword + '</span>');
        });
    }

    contentDiv.innerHTML = htmlContent.replace(/\n/g, '<br>');
}

function showEssayList() {
    document.getElementById('essay-list').style.display = 'grid';
    document.getElementById('essay-viewer').style.display = 'none';
    currentEssayData = null;
}

function filterEssays() {
    const keyword = document.getElementById('essay-search').value.toLowerCase();
    const category = document.getElementById('essay-category-filter').value;
    const cards = document.querySelectorAll('.essay-card');

    cards.forEach(card => {
        const title = card.querySelector('h4').textContent.toLowerCase();
        const type = card.querySelector('.essay-type').textContent;

        const matchesKeyword = title.includes(keyword);
        const matchesCategory = category === 'all' || type === category;

        if (matchesKeyword && matchesCategory) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==================== 政策文件模块 ====================
function initPolicyModule() {
    const uploadBtn = document.getElementById('upload-policy-btn');
    const modal = document.getElementById('policy-modal');
    const closeBtn = document.getElementById('close-policy-modal');

    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
            resetPolicyModal();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // 生成多版本按钮
    const generateBtn = document.getElementById('policy-generate-btn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generatePolicyVersions);
    }

    // 保存按钮
    const saveBtn = document.getElementById('policy-save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', savePolicy);
    }

    // 返回列表
    const backBtn = document.getElementById('back-to-policy-list');
    if (backBtn) {
        backBtn.addEventListener('click', showPolicyList);
    }

    // 搜索功能
    const searchInput = document.getElementById('policy-search');
    if (searchInput) {
        searchInput.addEventListener('input', filterPolicies);
    }

    // 版本切换标签
    initPolicyVersionTabs();
}

function resetPolicyModal() {
    document.getElementById('policy-title-input').value = '';
    document.getElementById('policy-content-input').value = '';
    document.getElementById('policy-versions').style.display = 'none';
    document.getElementById('version-content').innerHTML = '';
}

function initPolicyVersionTabs() {
    const tabs = document.querySelectorAll('.version-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            const version = this.dataset.version;
            displayPolicyVersion(version);
        });
    });
}

function generatePolicyVersions() {
    const content = document.getElementById('policy-content-input').value.trim();

    if (!content) {
        alert('⚠️ 请先输入或粘贴政策原文');
        return;
    }

    // 生成重点标注版（模拟）
    const highlightedVersion = content; // 实际应该调用AI分析，这里先模拟

    // 生成摘要版（100/200/500字）
    const summary100 = content.substring(0, 100) + '...';
    const summary200 = content.substring(0, 200) + '...';
    const summary500 = content.substring(0, 500) + '...';

    // 生成挖空版（模拟）
    const clozeVersion = content; // 实际应该调用AI分析，这里先模拟

    // 保存到currentPolicyData
    currentPolicyData = {
        original: content,
        highlighted: highlightedVersion,
        summary100: summary100,
        summary200: summary200,
        summary500: summary500,
        cloze: clozeVersion
    };

    // 显示版本区域
    document.getElementById('policy-versions').style.display = 'block';

    // 默认显示重点标注版
    displayPolicyVersion('highlighted');

    alert('✅ 多版本生成成功！\n\n💡 提示：完整功能需要AI分析，当前为模拟版本。');
}

function displayPolicyVersion(version) {
    const contentDiv = document.getElementById('version-content');

    if (!currentPolicyData) {
        contentDiv.innerHTML = '<p class="empty-state">请先生成多版本</p>';
        return;
    }

    let content = '';
    switch(version) {
        case 'highlighted':
            content = currentPolicyData.highlighted;
            break;
        case 'summary':
            content = `📝 摘要版（100字）:\n${currentPolicyData.summary100}\n\n📝 摘要版（200字）:\n${currentPolicyData.summary200}\n\n📝 摘要版（500字）:\n${currentPolicyData.summary500}`;
            break;
        case 'cloze':
            content = currentPolicyData.cloze;
            break;
        default:
            content = currentPolicyData.original;
    }

    contentDiv.innerHTML = content.replace(/\n/g, '<br>');
}

function savePolicy() {
    const title = document.getElementById('policy-title-input').value.trim();
    const content = document.getElementById('policy-content-input').value.trim();

    if (!title || !content) {
        alert('⚠️ 请填写标题和内容');
        return;
    }

    const policies = JSON.parse(localStorage.getItem('policies') || '[]');

    policies.push({
        id: Date.now(),
        title: title,
        originalContent: content,
        versions: currentPolicyData,
        createdAt: new Date().toISOString()
    });

    localStorage.setItem('policies', JSON.stringify(policies));

    alert('✅ 政策文件保存成功！');

    document.getElementById('policy-modal').style.display = 'none';
    loadPolicies();
}

function loadPolicies() {
    const saved = JSON.parse(localStorage.getItem('policies') || '[]');
    const list = document.getElementById('policy-list');

    if (saved.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📑</span>
                <p>还没有政策文件</p>
                <p class="hint">点击「上传政策」开始添加</p>
            </div>
        `;
        return;
    }

    list.innerHTML = '';
    saved.forEach((policy, index) => {
        const card = document.createElement('div');
        card.className = 'policy-card slide-in';
        card.style.animationDelay = (index * 0.1) + 's';

        const date = new Date(policy.createdAt).toLocaleDateString('zh-CN');

        card.innerHTML = `
            <h4>${escapeHtml(policy.title)}</h4>
            <p>📝 ${policy.originalContent.length} 字</p>
            <p class="card-date">📅 ${date}</p>
        `;

        card.onclick = () => viewPolicy(policy.id);

        list.appendChild(card);
    });
}

function viewPolicy(id) {
    const saved = JSON.parse(localStorage.getItem('policies') || '[]');
    const policy = saved.find(p => p.id === id);

    if (!policy) {
        alert('❌ 政策文件不存在');
        return;
    }

    currentPolicyData = policy;

    // 隐藏列表，显示查看器
    document.getElementById('policy-list').style.display = 'none';
    document.getElementById('policy-viewer').style.display = 'block';

    // 设置标题
    document.getElementById('policy-viewer-title').textContent = policy.title;

    // 显示内容
    const contentDiv = document.getElementById('policy-viewer-content');
    contentDiv.innerHTML = policy.originalContent.replace(/\n/g, '<br>');
}

function showPolicyList() {
    document.getElementById('policy-list').style.display = 'grid';
    document.getElementById('policy-viewer').style.display = 'none';
    currentPolicyData = null;
}

function filterPolicies() {
    const keyword = document.getElementById('policy-search').value.toLowerCase();
    const cards = document.querySelectorAll('.policy-card');

    cards.forEach(card => {
        const title = card.querySelector('h4').textContent.toLowerCase();

        if (title.includes(keyword)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ==================== 待办清单模块 ====================
function initTodoModule() {
    const addBtn = document.getElementById('todo-add-btn');
    const input = document.getElementById('todo-input');
    const clearBtn = document.getElementById('clear-completed-btn');

    if (addBtn && input) {
        addBtn.addEventListener('click', addTodo);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addTodo();
            }
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearCompletedTodos);
    }

    // 筛选按钮
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterTodos(this.dataset.filter);
        });
    });
}

function addTodo() {
    const input = document.getElementById('todo-input');
    const priority = document.getElementById('todo-priority').value;
    const text = input.value.trim();

    if (!text) {
        alert('⚠️ 请输入待办事项');
        return;
    }

    const todos = JSON.parse(localStorage.getItem('todos') || '[]');

    todos.push({
        id: Date.now(),
        text: text,
        priority: priority,
        completed: false,
        createdAt: new Date().toISOString()
    });

    localStorage.setItem('todos', JSON.stringify(todos));
    input.value = '';

    loadTodos();
}

function loadTodos() {
    const saved = JSON.parse(localStorage.getItem('todos') || '[]');
    const list = document.getElementById('todo-list');
    const statsText = document.getElementById('todo-stats-text');

    if (saved.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">✅</span>
                <p>还没有待办事项</p>
                <p class="hint">添加你的第一个任务吧！</p>
            </div>
        `;
        statsText.textContent = '0 个任务，0 个已完成';
        return;
    }

    list.innerHTML = '';

    let completedCount = 0;

    saved.forEach((todo, index) => {
        if (todo.completed) completedCount++;

        const item = document.createElement('div');
        item.className = 'todo-item slide-in ' + (todo.completed ? 'completed' : '');
        item.style.animationDelay = (index * 0.05) + 's';

        const priorityClass = 'priority-' + todo.priority;

        item.innerHTML = `
            <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" onclick="toggleTodo(${todo.id})">
                ${todo.completed ? '✓' : ''}
            </div>
            <span class="todo-text">${escapeHtml(todo.text)}</span>
            <span class="todo-priority ${priorityClass}">${getPriorityText(todo.priority)}</span>
            <button class="todo-delete" onclick="deleteTodo(${todo.id})" title="删除">🗑️</button>
        `;

        list.appendChild(item);
    });

    statsText.textContent = `${saved.length} 个任务，${completedCount} 个已完成`;
}

function getPriorityText(priority) {
    switch(priority) {
        case 'high': return '高优先级';
        case 'medium': return '中优先级';
        case 'low': return '低优先级';
        default: return '中优先级';
    }
}

function toggleTodo(id) {
    const todos = JSON.parse(localStorage.getItem('todos') || '[]');
    const todo = todos.find(t => t.id === id);

    if (todo) {
        todo.completed = !todo.completed;
        localStorage.setItem('todos', JSON.stringify(todos));
        loadTodos();
    }
}

function deleteTodo(id) {
    if (!confirm('确定要删除这个待办事项吗？')) {
        return;
    }

    const todos = JSON.parse(localStorage.getItem('todos') || '[]');
    const newTodos = todos.filter(t => t.id !== id);

    localStorage.setItem('todos', JSON.stringify(newTodos));
    loadTodos();
}

function clearCompletedTodos() {
    const todos = JSON.parse(localStorage.getItem('todos') || '[]');
    const activeTodos = todos.filter(t => !t.completed);

    if (activeTodos.length === todos.length) {
        alert('⚠️ 没有已完成的待办事项');
        return;
    }

    if (!confirm(`确定要清除 ${todos.length - activeTodos.length} 个已完成的待办事项吗？`)) {
        return;
    }

    localStorage.setItem('todos', JSON.stringify(activeTodos));
    loadTodos();
}

function filterTodos(filter) {
    const items = document.querySelectorAll('.todo-item');

    items.forEach(item => {
        switch(filter) {
            case 'all':
                item.style.display = 'flex';
                break;
            case 'pending':
                if (item.classList.contains('completed')) {
                    item.style.display = 'none';
                } else {
                    item.style.display = 'flex';
                }
                break;
            case 'completed':
                if (item.classList.contains('completed')) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
                break;
        }
    });
}

// ==================== 数据管理功能 ====================
function initDataManagement() {
    const exportBtn = document.getElementById('export-data-btn');
    const importBtn = document.getElementById('import-data-btn');
    const clearBtn = document.getElementById('clear-data-btn');
    const importInput = document.getElementById('import-file-input');

    if (exportBtn) {
        exportBtn.addEventListener('click', exportAllData);
    }

    if (importBtn) {
        importBtn.addEventListener('click', () => {
            importInput.click();
        });
    }

    if (importInput) {
        importInput.addEventListener('change', importAllData);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllData);
    }
}

function exportAllData() {
    const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        mindmaps: JSON.parse(localStorage.getItem('mindmaps') || '[]'),
        essays: JSON.parse(localStorage.getItem('essays') || '[]'),
        policies: JSON.parse(localStorage.getItem('policies') || '[]'),
        todos: JSON.parse(localStorage.getItem('todos') || '[]')
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = '遴选备考数据备份_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();

    URL.revokeObjectURL(url);

    alert('✅ 数据导出成功！\n\n文件已保存到下载文件夹。\n建议定期备份，防止数据丢失。');
}

function importAllData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.version || !data.mindmaps === undefined) {
                alert('❌ 无效的数据文件！');
                return;
            }

            const confirmMsg = `确认要导入数据吗？\n\n` +
                `将导入：\n` +
                `- ${data.mindmaps.length} 个思维导图\n` +
                `- ${data.essays.length} 篇范文\n` +
                `- ${data.policies.length} 个政策文件\n` +
                `- ${data.todos.length} 个待办事项\n\n` +
                `⚠️ 注意：导入将覆盖当前数据！`;

            if (!confirm(confirmMsg)) {
                return;
            }

            localStorage.setItem('mindmaps', JSON.stringify(data.mindmaps || []));
            localStorage.setItem('essays', JSON.stringify(data.essays || []));
            localStorage.setItem('policies', JSON.stringify(data.policies || []));
            localStorage.setItem('todos', JSON.stringify(data.todos || []));

            alert('✅ 数据导入成功！\n\n页面将刷新以加载数据。');

            location.reload();
        } catch (err) {
            alert('❌ 文件格式错误：' + err.message);
        }
    };

    reader.readAsText(file);
    event.target.value = '';
}

function clearAllData() {
    const mindmaps = JSON.parse(localStorage.getItem('mindmaps') || '[]');
    const essays = JSON.parse(localStorage.getItem('essays') || '[]');
    const policies = JSON.parse(localStorage.getItem('policies') || '[]');
    const todos = JSON.parse(localStorage.getItem('todos') || '[]');

    const total = mindmaps.length + essays.length + policies.length + todos.length;

    if (total === 0) {
        alert('⚠️ 没有可清除的数据。');
        return;
    }

    const confirmMsg = `⚠️ 警告：此操作不可恢复！\n\n` +
        `将清除：\n` +
        `- ${mindmaps.length} 个思维导图\n` +
        `- ${essays.length} 篇范文\n` +
        `- ${policies.length} 个政策文件\n` +
        `- ${todos.length} 个待办事项\n\n` +
        `确定要清除所有数据吗？`;

    if (!confirm(confirmMsg)) {
        return;
    }

    if (!confirm('🚨 最后确认：真的要删除所有数据吗？')) {
        return;
    }

    localStorage.removeItem('mindmaps');
    localStorage.removeItem('essays');
    localStorage.removeItem('policies');
    localStorage.removeItem('todos');

    alert('✅ 所有数据已清除！');

    location.reload();
}
