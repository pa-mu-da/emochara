const THEMES = {
    standard: {
        bg: '#f9f9f9',
        text: '#333333',
        accent: '#2c3e50',
        subAccent: '#546e7a', // Darker for readability
        chartFill: 'rgba(52, 152, 219, 0.4)',
        chartLine: '#2980b9',
        fontMain: '"Shippori Mincho", serif',
        fontSub: '"Noto Sans JP", sans-serif',
        decorType: 'simple'
    },
    dark: {
        bg: '#1a1a1a',
        text: '#ecf0f1',
        accent: '#e74c3c',
        subAccent: '#bdc3c7', // Lighter for readability on dark
        chartFill: 'rgba(231, 76, 60, 0.4)',
        chartLine: '#c0392b',
        fontMain: '"Zen Antique", serif',
        fontSub: '"Noto Sans JP", sans-serif',
        decorType: 'sharp'
    },
    pastel: {
        bg: '#fff0f5',
        text: '#554455',
        accent: '#ffb7b2',
        subAccent: '#88a09e', // Darker/Desaturated Green for readability
        chartFill: 'rgba(255, 159, 243, 0.4)',
        chartLine: '#f368e0',
        fontMain: '"Kiwi Maru", serif',
        fontSub: '"Start", sans-serif',
        decorType: 'rounded'
    },
    noir: {
        bg: '#000000',
        text: '#ffffff',
        accent: '#ffffff',
        subAccent: '#bbbbbb', // Lighter grey
        chartFill: 'rgba(255, 255, 255, 0.2)',
        chartLine: '#ffffff',
        fontMain: '"Sawarabi Mincho", serif',
        fontSub: '"Noto Sans JP", sans-serif',
        decorType: 'double'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const jsonInput = document.getElementById('jsonInput');
    const imageInput = document.getElementById('imageInput');
    const freeText = document.getElementById('freeText');
    const generateBtn = document.getElementById('generateBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const canvas = document.getElementById('sheetCanvas');
    const ctx = canvas.getContext('2d');

    let userImage = null;

    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    userImage = img;
                    console.log('User image loaded');
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    generateBtn.addEventListener('click', () => {
        try {
            const jsonStr = jsonInput.value.trim();
            if (!jsonStr) {
                alert('JSONを入力してください');
                return;
            }
            const data = JSON.parse(jsonStr);
            console.log('Parsed JSON:', data);

            const selectedThemeKey = document.querySelector('input[name="theme"]:checked').value;
            const theme = THEMES[selectedThemeKey];
            const textStr = freeText.value;

            drawCharacterSheet(ctx, data, theme, userImage, textStr, canvas.width, canvas.height);
            downloadBtn.disabled = false;
        } catch (e) {
            console.error(e);
            alert('JSONのパースに失敗しました。正しい形式か確認してください。\n' + e.message);
        }
    });

    downloadBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        link.download = `emoklore_sheet_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});

function drawCharacterSheet(ctx, data, theme, userImg, freeText, width, height) {
    // 0. Setup
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    // Extract Data
    const charName = data.data.name || "No Name";
    const furigana = extractFurigana(data.data.memo);
    const stats = extractStats(data);
    const skills = extractSkills(data);
    const resonance = extractResonance(data.data.memo);

    // Layout Constants
    const PADDING = 50;
    const LEFT_COL_WIDTH = 500;
    const RIGHT_COL_START = PADDING + LEFT_COL_WIDTH + PADDING; // 600
    const RIGHT_COL_WIDTH = width - RIGHT_COL_START - PADDING; // 850

    // ================= LEFT COLUMN =================
    // 1. Name & Furigana
    ctx.fillStyle = theme.text;
    ctx.font = `bold 80px ${theme.fontMain}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(charName, PADDING, PADDING);

    if (furigana) {
        ctx.font = `24px ${theme.fontSub}`;
        ctx.fillStyle = theme.subAccent;
        ctx.fillText(furigana, PADDING + 5, PADDING + 95);
    }

    // 2. Character Image
    // UPDATED: 500x750
    const imgAreaW = 500;
    const imgAreaH = 750;
    const imgX = PADDING;
    const imgY = height - PADDING - imgAreaH; // 1000 - 50 - 750 = 200
    // Check: Name text is at 50, height ~100 with furigana. 200 is clear.

    if (userImg) {
        ctx.save();
        const srcRatio = userImg.width / userImg.height;
        const paramRatio = imgAreaW / imgAreaH;
        let dw, dh, dx, dy;

        if (srcRatio > paramRatio) {
            dw = imgAreaW;
            dh = imgAreaW / srcRatio;
            dx = imgX;
            dy = imgY + (imgAreaH - dh) / 2;
        } else {
            dh = imgAreaH;
            dw = imgAreaH * srcRatio;
            dx = imgX + (imgAreaW - dw) / 2;
            dy = imgY;
        }

        ctx.drawImage(userImg, dx, dy, dw, dh);

        ctx.restore();
    } else {
        ctx.strokeStyle = theme.subAccent;
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(imgX, imgY, imgAreaW, imgAreaH);
        ctx.setLineDash([]);

        ctx.fillStyle = theme.subAccent;
        ctx.font = `20px ${theme.fontSub}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("Character Image Area (500x750)", imgX + imgAreaW / 2, imgY + imgAreaH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // ================= RIGHT COLUMN =================
    const row1Y = PADDING;
    const row1H = 350;

    // 3. Radar Chart 
    const chartCenterX = RIGHT_COL_START + 200;
    const chartCenterY = row1Y + 175;
    const chartRadius = 140;

    drawRadarChart(ctx, stats, chartCenterX, chartCenterY, chartRadius, theme);

    // 4. Resonance 
    const resonanceX = RIGHT_COL_START + 420;
    const resonanceY = row1Y + 50;
    drawResonance(ctx, resonance, resonanceX, resonanceY, 400, theme);


    // Row 2: Skills
    const row2Y = row1Y + row1H + 20;
    const row2H = 400;
    drawSkillList(ctx, skills, RIGHT_COL_START, row2Y, RIGHT_COL_WIDTH, row2H, theme);

    // Row 3: Memo
    const row3Y = row2Y + row2H + 20;
    const row3H = height - row3Y - PADDING;
    drawFreeTextSection(ctx, freeText, RIGHT_COL_START, row3Y, RIGHT_COL_WIDTH, row3H, theme);
}

function drawSeparator(ctx, x, y, w, theme) {
    ctx.beginPath();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;

    if (theme.decorType === 'rounded') {
        ctx.setLineDash([5, 10]);
        ctx.lineCap = 'round';
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineCap = 'butt';
    } else if (theme.decorType === 'double') {
        ctx.lineWidth = 1;
        ctx.moveTo(x, y - 2);
        ctx.lineTo(x + w, y - 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y + 2);
        ctx.lineTo(x + w, y + 2);
        ctx.stroke();
    } else if (theme.decorType === 'sharp') {
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, theme.accent);
        grad.addColorStop(1, 'transparent');
        ctx.strokeStyle = grad;
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();
    } else {
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();
    }
}

function extractFurigana(memo) {
    if (!memo) return null;
    const lines = memo.split('\n');
    for (const line of lines) {
        const match = line.match(/^ふりがな[:：]\s*(.*)$/);
        if (match) {
            const content = match[1].trim();
            return content ? content : null;
        }
    }
    return null;
}

function extractStats(data) {
    const targetLabels = ["身体", "器用", "精神", "五感", "知力", "魅力", "社会", "運勢"];
    const params = data.data.params || [];
    return targetLabels.map(label => {
        const p = params.find(item => item.label === label);
        return {
            label: label,
            value: p ? parseInt(p.value, 10) : 0
        };
    });
}

function extractSkills(data) {
    if (!data.data.commands) return [];
    const lines = data.data.commands.split('\n');
    const skills = [];
    const skillRegex = /(.+?)DM<=(.+?)\s*[〈<](.+?)[〉>]/;

    let hasInfinityResonance = false;

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        const match = line.match(skillRegex);
        if (match) {
            const skillName = match[3];
            if (skillName.includes('＊') || skillName.includes('*')) return;

            if (skillName.includes('∞共鳴')) {
                if (!hasInfinityResonance) {
                    skills.push({
                        name: '∞共鳴',
                        lv: '',
                        value: '',
                        isResonance: true
                    });
                    hasInfinityResonance = true;
                }
                return;
            }

            skills.push({
                name: skillName,
                lv: match[1].trim(),
                value: match[2].trim(),
                isResonance: false
            });
        }
    });
    return skills;
}

function extractResonance(memo) {
    if (!memo) return { omote: '', ura: '', roots: '' };
    const result = { omote: 'なし', ura: 'なし', roots: 'なし' };

    const omoteMatch = memo.match(/共鳴感情[・･]表[:：]\s*(.+)/);
    if (omoteMatch) result.omote = omoteMatch[1].trim();

    const uraMatch = memo.match(/共鳴感情[・･]裏[:：]\s*(.+)/);
    if (uraMatch) result.ura = uraMatch[1].trim();

    const rootsMatch = memo.match(/共鳴感情[・･]ルーツ[:：]\s*(.+)/);
    if (rootsMatch) result.roots = rootsMatch[1].trim();

    return result;
}

function drawRadarChart(ctx, stats, x, y, radius, theme) {
    const numStats = stats.length;
    const angleStep = (Math.PI * 2) / numStats;

    ctx.strokeStyle = theme.subAccent;
    ctx.lineWidth = 1;
    for (let level = 1; level <= 6; level++) {
        ctx.beginPath();
        for (let i = 0; i < numStats; i++) {
            const angle = i * angleStep - Math.PI / 2;
            const r = (radius / 6) * level;
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
    }

    ctx.fillStyle = theme.text;
    ctx.font = `bold 18px ${theme.fontSub}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < numStats; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(px, py);
        ctx.stroke();

        const labelR = radius + 25;
        const lx = x + Math.cos(angle) * labelR;
        const ly = y + Math.sin(angle) * labelR;
        ctx.fillText(`${stats[i].label} ${stats[i].value}`, lx, ly);
    }

    ctx.fillStyle = theme.chartFill;
    ctx.strokeStyle = theme.chartLine;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < numStats; i++) {
        const angle = i * angleStep - Math.PI / 2;
        let val = stats[i].value;
        if (val > 6) val = 6; if (val < 0) val = 0;
        const r = (radius / 6) * val;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawResonance(ctx, resonance, x, y, w, theme) {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    ctx.fillStyle = theme.accent;
    ctx.font = `bold 24px ${theme.fontMain}`;
    ctx.fillText("共鳴感情", x, y);

    drawSeparator(ctx, x, y + 35, w, theme);

    let currentY = y + 60;
    const lineHeight = 60;

    function drawItem(label, value) {
        ctx.font = `bold 18px ${theme.fontMain}`;
        ctx.fillStyle = theme.subAccent;
        ctx.fillText(label, x + 5, currentY + 12);

        ctx.font = `bold 32px ${theme.fontMain}`;
        ctx.fillStyle = theme.text;

        const metrics = ctx.measureText(value);
        const valX = x + 80;

        ctx.save();
        ctx.fillStyle = theme.chartFill;
        ctx.fillRect(valX, currentY + 20, metrics.width, 10);
        ctx.restore();

        ctx.fillText(value, valX, currentY);
        currentY += lineHeight;
    }
    drawItem("表:", resonance.omote);
    drawItem("裏:", resonance.ura);
    drawItem("ルーツ:", resonance.roots);
}

function drawSkillList(ctx, skills, x, y, w, h, theme) {
    ctx.fillStyle = theme.accent;
    ctx.font = `bold 24px ${theme.fontMain}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText("技能", x, y);

    drawSeparator(ctx, x, y + 35, w, theme);

    const startY = y + 50;
    const colGap = 20;
    const numCols = 2;
    const colWidth = (w - (colGap * (numCols - 1))) / numCols;
    const lineHeight = 30;
    const maxPerCol = Math.floor((h - 50) / lineHeight);

    ctx.fillStyle = theme.text;
    ctx.textBaseline = 'top';

    skills.forEach((skill, index) => {
        const colIndex = Math.floor(index / maxPerCol);
        if (colIndex >= numCols) return;

        const rowIndex = index % maxPerCol;
        const cellX = x + colIndex * (colWidth + colGap);
        const cellY = startY + rowIndex * lineHeight;

        const nameW = colWidth * 0.75;

        let name = skill.name;
        ctx.font = `18px ${theme.fontSub}`;
        const maxNameW = nameW - 5;

        if (ctx.measureText(name).width > maxNameW) {
            while (ctx.measureText(name + "..").width > maxNameW && name.length > 0) {
                name = name.slice(0, -1);
            }
            name += "..";
        }

        ctx.textAlign = 'left';
        ctx.fillStyle = theme.text;
        ctx.fillText(name, cellX, cellY);

        if (skill.isResonance) return;

        ctx.font = `14px ${theme.fontSub}`;
        ctx.fillStyle = theme.subAccent;
        ctx.fillText(`Lv:${skill.lv}`, cellX + nameW, cellY + 3);

        ctx.textAlign = 'left';
        ctx.font = `bold 18px ${theme.fontSub}`;
        ctx.fillStyle = theme.text;
        // 50px offset from Lv start seems appropriate based on previous code
        ctx.fillText(skill.value, cellX + nameW + 50, cellY);
    });
}

function drawFreeTextSection(ctx, text, x, y, w, h, theme) {
    if (h < 50 || !text) return;

    // Explicitly reset alignment to Left/Alphabetic/Top as needed
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top'; // Set to top for multi-line text mapping

    // Create clipping region
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - 5, y, w + 10, h);
    ctx.clip();

    const bgY = y;
    const bgH = h;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    if (theme.bg === '#f9f9f9') ctx.fillStyle = 'rgba(0,0,0,0.03)';
    ctx.fillRect(x, bgY, w, bgH);

    const contentY = bgY + 15;
    const padding = 15;
    const innerW = w - padding * 2;
    const startX = x + padding;

    ctx.fillStyle = theme.text;
    ctx.font = `18px ${theme.fontSub}`;

    wrapText(ctx, text, startX, contentY, innerW, 26, h - 30);

    ctx.restore();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxHeight) {
    const lines = text.split('\n');
    let cursorY = y;
    const startY = y;

    // Align left for text wrapping (needed inside the loop)
    ctx.textAlign = 'left';

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        let words = line.split('');
        let lineBuffer = '';

        for (let n = 0; n < words.length; n++) {
            const testLine = lineBuffer + words[n];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                if (maxHeight && (cursorY - startY + lineHeight) > maxHeight) return;

                ctx.fillText(lineBuffer, x, cursorY);
                lineBuffer = words[n];
                cursorY += lineHeight;
            } else {
                lineBuffer = testLine;
            }
        }
        if (maxHeight && (cursorY - startY) > maxHeight) return;
        ctx.fillText(lineBuffer, x, cursorY);
        cursorY += lineHeight;
    }
}
