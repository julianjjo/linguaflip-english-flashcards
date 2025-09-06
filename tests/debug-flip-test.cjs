const { expect } = require('chai');
const puppeteer = require('puppeteer');

describe('Debug Flashcard Flip', function () {
    this.timeout(30000);
    let browser, page;

    before(async () => {
        browser = await puppeteer.launch({
            headless: false,
            devtools: true, // Open devtools to see console logs
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.type() === 'log') {
                console.log('🖥️  BROWSER LOG:', msg.text());
            } else if (msg.type() === 'error') {
                console.error('❌ BROWSER ERROR:', msg.text());
            }
        });
    });

    after(async () => {
        if (browser) {
            await browser.close();
        }
    });

    it('should debug the click interaction', async () => {
        console.log('🌐 Navigating to app...');
        await page.goto('http://localhost:4325', { waitUntil: 'domcontentloaded' });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('🔍 Checking for flashcards...');
        const hasCards = await page.evaluate(() => {
            return !!document.querySelector('.flashcard-mobile');
        });
        
        console.log('📋 Has flashcards:', hasCards);
        
        if (hasCards) {
            console.log('🖱️  Clicking flashcard...');
            
            // Try clicking and see what logs appear
            await page.click('.flashcard-mobile');
            
            // Wait a bit to see what happens
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if flip state changed
            const flipState = await page.evaluate(() => {
                const container = document.querySelector('.flashcard-container');
                return container ? container.classList.contains('rotate-y-180') : null;
            });
            
            console.log('🔄 Flip state after click:', flipState);
            
        } else {
            console.log('⚠️  No flashcards found - need to generate cards first');
            
            // Try to find and click a generate button
            const buttons = await page.$$('button');
            console.log('🔲 Found', buttons.length, 'buttons');
            
            for (let i = 0; i < buttons.length; i++) {
                const text = await page.evaluate(el => el.textContent, buttons[i]);
                console.log(`   Button ${i}: "${text}"`);
                
                if (text.toLowerCase().includes('generate') || text.toLowerCase().includes('crear')) {
                    console.log('🎯 Clicking generate button...');
                    await buttons[i].click();
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    break;
                }
            }
            
            // Check again for flashcards
            const hasCardsNow = await page.evaluate(() => {
                return !!document.querySelector('.flashcard-mobile');
            });
            
            if (hasCardsNow) {
                console.log('✅ Cards generated, testing flip...');
                await page.click('.flashcard-mobile');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const flipState = await page.evaluate(() => {
                    const container = document.querySelector('.flashcard-container');
                    return container ? container.classList.contains('rotate-y-180') : null;
                });
                
                console.log('🔄 Flip state after click:', flipState);
            }
        }
        
        // Take screenshot for reference
        await page.screenshot({ path: 'debug-flip-test.png' });
    });
});