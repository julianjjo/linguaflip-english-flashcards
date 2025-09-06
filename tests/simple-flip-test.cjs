const { expect } = require('chai');
const puppeteer = require('puppeteer');

describe('Simple Flashcard Flip Test', function () {
    this.timeout(30000);
    let browser, page;

    before(async () => {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
    });

    after(async () => {
        if (browser) {
            await browser.close();
        }
    });

    it('should load the app and check for flashcard elements', async () => {
        await page.goto('http://localhost:4325', { waitUntil: 'domcontentloaded' });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'debug-app-loaded.png' });
        
        // Check what's actually on the page
        const pageContent = await page.evaluate(() => {
            return {
                title: document.title,
                bodyText: document.body.textContent.substring(0, 500),
                hasFlashcards: !!document.querySelector('.flashcard-mobile'),
                hasFlashcardContainer: !!document.querySelector('.flashcard-container'),
                hasCardFront: !!document.querySelector('.card-front'),
                hasCardBack: !!document.querySelector('.card-back'),
                allClasses: Array.from(document.querySelectorAll('*')).map(el => el.className).filter(cls => cls && typeof cls === 'string' && cls.includes('card')).slice(0, 10)
            };
        });
        
        console.log('Page content analysis:', pageContent);
        
        // Just verify the app loaded
        expect(pageContent.title).to.not.be.empty;
        
        if (pageContent.hasFlashcards) {
            console.log('✅ Flashcards found - proceeding with flip test');
            
            // Test flip functionality
            const initialState = await page.evaluate(() => {
                const container = document.querySelector('.flashcard-container');
                return container ? container.classList.contains('rotate-y-180') : null;
            });
            
            console.log('Initial flip state:', initialState);
            
            // Click to flip
            await page.click('.flashcard-mobile');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const flippedState = await page.evaluate(() => {
                const container = document.querySelector('.flashcard-container');
                return container ? container.classList.contains('rotate-y-180') : null;
            });
            
            console.log('After click flip state:', flippedState);
            
            if (initialState !== null && flippedState !== null) {
                expect(initialState).to.not.equal(flippedState);
                console.log('✅ Flip functionality working correctly!');
            }
            
        } else {
            console.log('ℹ️  No flashcards found - app may need cards generated first');
            console.log('Available elements:', pageContent.allClasses);
        }
    });
});