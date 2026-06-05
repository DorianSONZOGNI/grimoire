import re

with open('src/main/resources/static/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace the CSS for the tooltip
old_css = '''        .sandbox-spell-tooltip {
            display: none;
            position: absolute;
            bottom: 100%;
            right: 0;
            width: max-content;
            max-width: 400px;
            background: #1e293b;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 6px;
            padding: 0.8rem;
            z-index: 1000;
            box-shadow: 0 10px 25px rgba(0,0,0,0.7);
            margin-bottom: 0.5rem;
            flex-direction: column;
            gap: 0.3rem;
            font-size: 0.75rem;
        }
        .spell-effects-trigger:hover .sandbox-spell-tooltip {
            display: flex;
        }'''

new_css = '''        #globalSpellTooltip {
            display: none;
            position: fixed;
            width: max-content;
            max-width: 450px;
            background: #1e293b;
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 8px;
            padding: 0.8rem;
            z-index: 999999;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
            flex-direction: column;
            gap: 0.3rem;
            font-size: 0.75rem;
            pointer-events: none;
        }'''

if old_css in content:
    content = content.replace(old_css, new_css)
else:
    print("Warning: old_css not found exactly. Will try regex.")
    # More robust replacement if whitespace differs slightly
    content = re.sub(r'\.sandbox-spell-tooltip\s*\{.*?\.spell-effects-trigger:hover\s*\.sandbox-spell-tooltip\s*\{\s*display:\s*flex;\s*\}', new_css, content, flags=re.DOTALL)

# 2. Add the JS functions at the end of the script block
js_funcs = '''
        function showGlobalTooltip(el) {
            let tooltip = document.getElementById('globalSpellTooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'globalSpellTooltip';
                document.body.appendChild(tooltip);
            }
            const dataEl = el.querySelector('.tooltip-data');
            if (!dataEl) return;
            
            tooltip.innerHTML = dataEl.innerHTML;
            tooltip.style.display = 'flex';
            
            const rect = el.getBoundingClientRect();
            let topPos = rect.top - tooltip.offsetHeight - 8;
            if (topPos < 10) topPos = rect.bottom + 8;
            
            let leftPos = rect.right - tooltip.offsetWidth;
            if (leftPos < 10) leftPos = 10;
            
            tooltip.style.top = topPos + 'px';
            tooltip.style.left = leftPos + 'px';
        }

        function hideGlobalTooltip() {
            const tooltip = document.getElementById('globalSpellTooltip');
            if (tooltip) tooltip.style.display = 'none';
        }
    </script>'''

if 'function showGlobalTooltip' not in content:
    content = content.replace('</script>', js_funcs)

# 3. Modify the HTML in renderSandboxSpells
old_html = '''                                <div class="spell-effects-trigger">
                                    <span class="badge" style="background: rgba(255,255,255,0.08); color: #94a3b8; font-size: 0.7rem; padding: 0.1rem 0.4rem; cursor: help;">Effets ?</span>
                                    
                                </div>'''

new_html = '''                                <div class="spell-effects-trigger" onmouseenter="showGlobalTooltip(this)" onmouseleave="hideGlobalTooltip()">
                                    <span class="badge" style="background: rgba(255,255,255,0.08); color: #94a3b8; font-size: 0.7rem; padding: 0.1rem 0.4rem; cursor: help;">Effets ?</span>
                                    <div class="tooltip-data" style="display: none;"></div>
                                </div>'''

if old_html in content:
    content = content.replace(old_html, new_html)

# Clean up tooltipHtml definition since it's no longer needed
content = content.replace('''                let tooltipHtml = '';
                if (effectsSummary) {
                    tooltipHtml = <div class="sandbox-spell-tooltip" style="--spell-color: ;"></div>;
                }''', '')


with open('src/main/resources/static/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Update successful!")
