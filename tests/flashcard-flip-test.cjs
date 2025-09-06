const { expect } = require('chai');
const puppeteer = require('puppeteer');

describe('Flashcard Flip Functionality', function () {
    this.timeout(30000);
    let browser, page;

    before(async () => {
        browser = await puppeteer.launch({
            headless: false, // Set to true for CI
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor'
            ]
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
    });

    after(async () => {
        if (browser) {
            await browser.close();
        }
    });

    it('should navigate to study page and test flip functionality', async () => {
        // Navigate to the application
        await page.goto('http://localhost:4325', { waitUntil: 'networkidle0' });
        
        // Wait for the page to load completely
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Page loaded, looking for flashcards...');

        // Look for flashcards or create some if none exist
        let hasFlashcards = false;
        try {
            await page.waitForSelector('.flashcard-mobile', { timeout: 5000 });
            hasFlashcards = true;
            console.log('Flashcards found on page');
        } catch (error) {
            console.log('No flashcards found, need to generate some');
        }

        if (!hasFlashcards) {
            // Try to find and click generate cards button
            try {
                const generateButton = await page.waitForSelector('button:contains("Generate AI Cards")', { timeout: 5000 });
                if (generateButton) {
                    await generateButton.click();
                    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for generation
                    console.log('Generated AI cards');
                }
            } catch (error) {
                console.log('Could not generate cards, trying manual approach');
                // Try alternative selectors
                const buttons = await page.$$('button');
                for (const button of buttons) {
                    const text = await page.evaluate(el => el.textContent, button);
                    if (text.includes('Generate') || text.includes('AI')) {
                        await button.click();
                        await new Promise(resolve => setTimeout(resolve, 3000));
                        break;
                    }
                }
            }
        }

        // Now look for flashcards again
        try {
            await page.waitForSelector('.flashcard-mobile', { timeout: 10000 });
            console.log('Flashcard found, proceeding with flip test');
        } catch (error) {
            console.log('Still no flashcards found, test cannot proceed');
            // Take a screenshot for debugging
            await page.screenshot({ path: 'debug-no-cards.png' });
            throw new Error('No flashcards available to test');
        }

        // Test 1: Check that flashcard exists and has proper structure
        const flashcard = await page.$('.flashcard-mobile');
        expect(flashcard).to.not.be.null;

        // Test 2: Check for front and back faces
        const frontFace = await page.$('.card-front');
        const backFace = await page.$('.card-back');
        expect(frontFace).to.not.be.null;
        expect(backFace).to.not.be.null;

        // Test 3: Check initial state (should show front)
        const frontVisible = await page.evaluate(() => {
            const front = document.querySelector('.card-front');
            return front && window.getComputedStyle(front).backfaceVisibility === 'hidden';
        });
        console.log('Front face backface-visibility:', frontVisible);

        // Test 4: Get initial text content
        const frontText = await page.evaluate(() => {
            const front = document.querySelector('.card-front h2');
            return front ? front.textContent.trim() : '';
        });
        console.log('Front text:', frontText);

        const backText = await page.evaluate(() => {
            const back = document.querySelector('.card-back h3');
            return back ? back.textContent.trim() : '';
        });
        console.log('Back text:', backText);

        // Test 5: Check initial flip state
        const initialFlipState = await page.evaluate(() => {
            const container = document.querySelector('.flashcard-container');
            return container ? container.classList.contains('rotate-y-180') : false;
        });
        console.log('Initial flip state (should be false):', initialFlipState);
        expect(initialFlipState).to.be.false;

        // Test 6: Click to flip the card
        await page.click('.flashcard-mobile');
        console.log('Clicked flashcard to flip');

        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 800));

        // Test 7: Check if card is now flipped
        const flippedState = await page.evaluate(() => {
            const container = document.querySelector('.flashcard-container');
            return container ? container.classList.contains('rotate-y-180') : false;
        });
        console.log('After click flip state (should be true):', flippedState);
        expect(flippedState).to.be.true;

        // Test 8: Verify different text is showing (Spanish translation)
        const currentVisibleText = await page.evaluate(() => {
            const container = document.querySelector('.flashcard-container');
            const isFlipped = container.classList.contains('rotate-y-180');
            if (isFlipped) {
                const back = document.querySelector('.card-back h3');
                return back ? back.textContent.trim() : '';
            } else {
                const front = document.querySelector('.card-front h2');
                return front ? front.textContent.trim() : '';
            }
        });
        console.log('Currently visible text:', currentVisibleText);

        // Test 9: Ensure the text changed (English vs Spanish)
        expect(currentVisibleText).to.not.equal(frontText);
        expect(currentVisibleText).to.equal(backText);

        // Test 10: Click again to flip back
        await page.click('.flashcard-mobile');
        await new Promise(resolve => setTimeout(resolve, 800));

        const flippedBackState = await page.evaluate(() => {
            const container = document.querySelector('.flashcard-container');
            return container ? container.classList.contains('rotate-y-180') : false;
        });
        console.log('After second click flip state (should be false):', flippedBackState);
        expect(flippedBackState).to.be.false;

        // Test 11: Test keyboard interaction (Enter key)
        await page.focus('.flashcard-mobile');
        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 800));

        const keyboardFlipState = await page.evaluate(() => {
            const container = document.querySelector('.flashcard-container');
            return container ? container.classList.contains('rotate-y-180') : false;
        });
        console.log('After Enter key flip state (should be true):', keyboardFlipState);
        expect(keyboardFlipState).to.be.true;

        // Test 12: Test space key
        await page.keyboard.press('Space');
        await new Promise(resolve => setTimeout(resolve, 800));

        const spaceFlipState = await page.evaluate(() => {
            const container = document.querySelector('.flashcard-container');
            return container ? container.classList.contains('rotate-y-180') : false;
        });
        console.log('After Space key flip state (should be false):', spaceFlipState);
        expect(spaceFlipState).to.be.false;

        console.log('All flip functionality tests passed!');

        // Take a final screenshot for verification
        await page.screenshot({ path: 'flashcard-flip-test-success.png' });
    });

    it('should test visual feedback during flip', async () => {
        // Navigate to the application if not already there
        if (page.url() !== 'http://localhost:4325/') {
            await page.goto('http://localhost:4325', { waitUntil: 'networkidle0' });
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Wait for flashcard
        await page.waitForSelector('.flashcard-mobile', { timeout: 10000 });

        // Test visual feedback (ring effect during flip)
        await page.click('.flashcard-mobile');
        
        // Check immediately for the ring effect
        const hasRingEffect = await page.evaluate(() => {
            const flashcard = document.querySelector('.flashcard-mobile');
            return flashcard && flashcard.classList.contains('ring-2');
        });
        
        console.log('Ring effect during flip:', hasRingEffect);
        
        // Wait for animation and ring effect to complete
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const ringEffectAfter = await page.evaluate(() => {
            const flashcard = document.querySelector('.flashcard-mobile');
            return flashcard && flashcard.classList.contains('ring-2');
        });
        
        console.log('Ring effect after flip completes:', ringEffectAfter);
        
        // The ring effect should disappear after the flip animation
        expect(ringEffectAfter).to.be.false;
    });
});