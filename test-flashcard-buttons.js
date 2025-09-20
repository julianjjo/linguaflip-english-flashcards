import puppeteer from 'puppeteer';

describe('Flashcard Buttons Test', () => {
  test('should test flashcard buttons', async () => {
    console.log('🧪 Iniciando prueba de botones de flashcards...');

    const browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    try {
    // Capturar errores de consola
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log('❌ Error en consola:', msg.text());
      }
    });

    console.log('📄 Navegando a http://localhost:4321/study...');
    await page.goto('http://localhost:4321/study', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('✅ Página cargada exitosamente');

    // Verificar errores específicos
    const hasUseAppError = consoleErrors.some(error =>
      error.includes('useApp must be used within an AppProvider')
    );
    const hasFlashcardError = consoleErrors.some(error =>
      error.includes('Flashcard is not defined')
    );

    if (hasUseAppError) {
      console.log('❌ ERROR: Aparece "useApp must be used within an AppProvider"');
    } else {
      console.log('✅ No se encontró error "useApp must be used within an AppProvider"');
    }

    if (hasFlashcardError) {
      console.log('❌ ERROR: Aparece "Flashcard is not defined"');
    } else {
      console.log('✅ No se encontró error "Flashcard is not defined"');
    }

    // Esperar a que se cargue el contenido dinámico
    await page.waitForTimeout(3000);

    // Verificar que existe el botón "Iniciar Sesión"
    const startButton = await page.$('#start-session-btn');
    if (startButton) {
      console.log('✅ Botón "Iniciar Sesión" encontrado');

      // Hacer clic en el botón
      await startButton.click();
      console.log('✅ Clic en botón "Iniciar Sesión" realizado');

      // Esperar a que se muestre el contenido de estudio
      await page.waitForTimeout(2000);

      // Verificar que el contenido de estudio se muestra
      const studyContent = await page.$('#study-content');
      if (studyContent) {
        console.log('✅ Contenido de estudio visible');

        // Verificar que existe el contenedor de flashcard
        const flashcardContainer = await page.$('#flashcard-container');
        if (flashcardContainer) {
          console.log('✅ Contenedor de flashcard encontrado');

          // Intentar hacer clic en la flashcard para voltearla
          await page.click('#flashcard-container');
          console.log('✅ Clic en flashcard realizado (volteo)');

          await page.waitForTimeout(1000);

          // Verificar botones de audio
          const audioButtons = await page.$$('button[aria-label*="audio"]');
          if (audioButtons.length > 0) {
            console.log(`✅ Encontrados ${audioButtons.length} botones de audio`);

            // Probar el primer botón de audio
            await audioButtons[0].click();
            console.log('✅ Clic en botón de audio realizado');
          } else {
            console.log('⚠️ No se encontraron botones de audio');
          }

          // Verificar controles de calidad de recuerdo
          const qualityControls = await page.$('#quality-controls');
          if (qualityControls) {
            console.log('✅ Controles de calidad de recuerdo encontrados');

            // Buscar botones de calidad
            const qualityButtons = await page.$$('#quality-controls button');
            if (qualityButtons.length > 0) {
              console.log(`✅ Encontrados ${qualityButtons.length} botones de calidad`);

              // Probar el primer botón de calidad
              await qualityButtons[0].click();
              console.log('✅ Clic en botón de calidad de recuerdo realizado');
            }
          } else {
            console.log('⚠️ No se encontraron controles de calidad de recuerdo');
          }

        } else {
          console.log('❌ Contenedor de flashcard no encontrado');
        }

      } else {
        console.log('❌ Contenido de estudio no visible');
      }

    } else {
      console.log('❌ Botón "Iniciar Sesión" no encontrado');
    }

    // Verificar errores finales
    console.log('\n📊 Resumen de errores en consola:');
    if (consoleErrors.length === 0) {
      console.log('✅ No se encontraron errores en consola');
    } else {
      console.log(`❌ Se encontraron ${consoleErrors.length} errores:`);
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }

    // Capturar screenshot final
    await page.screenshot({ path: 'flashcard-test-screenshot.png', fullPage: true });
    console.log('📸 Screenshot guardado como flashcard-test-screenshot.png');

    } catch (error) {
      console.error('❌ Error durante la prueba:', error.message);
    } finally {
      await browser.close();
      console.log('🔚 Prueba completada');
    }
  });
});