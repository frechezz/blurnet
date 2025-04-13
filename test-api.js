const axios = require('axios');
require('dotenv').config();

async function testApi() {
    try {
        const API_URL = process.env.API_URL || 'https://p.blurnet.ru';
        const COOKIE = process.env.API_COOKIE;
        const USERNAME = process.env.API_USERNAME;
        const PASSWORD = process.env.API_PASSWORD;

        console.log('=== ТЕСТ API ===');
        console.log('URL:', API_URL);
        console.log('Cookie:', COOKIE);
        console.log('Username:', USERNAME);
        
        // Тест авторизации
        console.log('\n1. Тестируем авторизацию...');
        const authResponse = await axios.post(
            `${API_URL}/api/auth/login`,
            {
                username: USERNAME,
                password: PASSWORD
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': COOKIE
                }
            }
        );
        
        console.log('Ответ авторизации:', JSON.stringify(authResponse.data, null, 2));

        if (authResponse.data && authResponse.data.response && authResponse.data.response.accessToken) {
            const token = authResponse.data.response.accessToken;
            console.log('Токен получен:', token.substring(0, 10) + '...');
            
            // Тест получения инбаундов
            console.log('\n2. Тестируем получение инбаундов...');
            const inboundsResponse = await axios.get(
                `${API_URL}/api/inbounds`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Cookie': COOKIE
                    }
                }
            );
            
            if (inboundsResponse.data && inboundsResponse.data.response) {
                const inbounds = inboundsResponse.data.response;
                console.log(`Найдено ${inbounds.length} инбаундов:`);
                
                inbounds.forEach((inbound, index) => {
                    console.log(`Инбаунд #${index+1}: tag=${inbound.tag}, uuid=${inbound.uuid}`);
                });
                
                // Ищем инбаунд по тегу "Steal" или берем первый
                const targetInbound = inbounds.find(inbound => inbound.tag === 'Steal') || inbounds[0];
                
                if (targetInbound) {
                    console.log(`\nБудем использовать инбаунд: ${targetInbound.tag} (${targetInbound.uuid})`);
                    
                    // Тест создания пользователя
                    console.log('\n3. Тестируем создание пользователя...');
                    const testUsername = 'test_user_' + Date.now();
                    
                    const userData = {
                        username: testUsername,
                        inboundId: targetInbound.uuid, // Используем UUID инбаунда
                        telegramId: 123456789,
                        trafficLimitBytes: 0,
                        trafficLimitStrategy: 'MONTH',
                        expireAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 дней
                        status: 'ACTIVE',
                        activateAllInbounds: false, // false, так как указываем конкретный инбаунд
                        description: 'Тестовый пользователь'
                    };
                    
                    console.log('Данные пользователя:', JSON.stringify(userData, null, 2));
                    
                    try {
                        const userResponse = await axios.post(
                            `${API_URL}/api/users`,
                            userData,
                            {
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                    'Cookie': COOKIE
                                }
                            }
                        );
                        
                        console.log('Ответ создания пользователя:', JSON.stringify(userResponse.data, null, 2));
                        
                        if (userResponse.data && userResponse.data.response) {
                            const user = userResponse.data.response;
                            console.log(`\nПользователь создан: ${user.username} (${user.uuid})`);
                            
                            // Генерируем URL подписки
                            if (user.uuid) {
                                const shortUuid = user.uuid.split('-')[0];
                                const subscriptionUrl = `${process.env.SUBSCRIPTION_URL}${shortUuid}/singbox`;
                                console.log(`URL подписки: ${subscriptionUrl}`);
                            }
                        }
                    } catch (userError) {
                        console.error('Ошибка создания пользователя:', userError.message);
                        if (userError.response) {
                            console.error('Статус:', userError.response.status);
                            console.error('Данные ошибки:', JSON.stringify(userError.response.data, null, 2));
                        }
                    }
                } else {
                    console.error('Не найдено ни одного инбаунда!');
                }
            } else {
                console.error('Ошибка получения инбаундов:', inboundsResponse.data);
            }
        } else {
            console.error('Ошибка авторизации:', authResponse.data);
        }
    } catch (error) {
        console.error('Ошибка при выполнении теста:', error.message);
        if (error.response) {
            console.error('Статус:', error.response.status);
            console.error('Данные ошибки:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

console.log('Запуск тестирования API...');
testApi()
    .then(() => console.log('\nТестирование завершено'))
    .catch(err => console.error('Критическая ошибка:', err)); 