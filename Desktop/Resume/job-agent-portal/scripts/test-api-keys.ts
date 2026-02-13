import { config } from 'dotenv'
import { resolve } from 'path'
import Anthropic from '@anthropic-ai/sdk'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

async function testAnthropicAPI() {
  console.log('\n🤖 Testing Anthropic API...')

  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.log('❌ ANTHROPIC_API_KEY not found in environment')
    return false
  }

  try {
    const anthropic = new Anthropic({
      apiKey: apiKey,
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 50,
      messages: [{
        role: 'user',
        content: 'Say "API connection successful" in exactly 3 words.'
      }]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      console.log('✅ Anthropic API is working!')
      console.log(`   Response: ${content.text}`)
      return true
    }
  } catch (error: any) {
    console.log('❌ Anthropic API test failed:', error.message)
    if (error.status === 401) {
      console.log('   Invalid API key')
    }
    return false
  }
}

async function testBrightDataAPI() {
  console.log('\n🌐 Testing Bright Data API...')

  const apiKey = process.env.BRIGHT_DATA_API_KEY
  const customerId = process.env.BRIGHT_DATA_CUSTOMER_ID
  const zone = process.env.BRIGHT_DATA_ZONE

  if (!apiKey || !customerId || !zone) {
    console.log('❌ Bright Data credentials not found in environment')
    console.log(`   API Key: ${apiKey ? '✓' : '✗'}`)
    console.log(`   Customer ID: ${customerId ? '✓' : '✗'}`)
    console.log(`   Zone: ${zone ? '✓' : '✗'}`)
    return false
  }

  try {
    // Test with a simple web scraping request
    const username = `${customerId}-zone-${zone}`
    const password = apiKey
    const proxyUrl = `http://${username}:${password}@brd.superproxy.io:33335`

    console.log('✅ Bright Data credentials configured!')
    console.log(`   Customer ID: ${customerId}`)
    console.log(`   Zone: ${zone}`)
    console.log(`   Proxy URL: ${proxyUrl}`)
    console.log('   Note: Full scraping test requires active proxy session')

    // We won't make an actual request here to avoid charges
    // The real test will happen when you trigger a scraping job
    return true
  } catch (error: any) {
    console.log('❌ Bright Data configuration test failed:', error.message)
    return false
  }
}

async function main() {
  console.log('═══════════════════════════════════════')
  console.log('  API Integration Test')
  console.log('═══════════════════════════════════════')

  const anthropicOk = await testAnthropicAPI()
  const brightDataOk = await testBrightDataAPI()

  console.log('\n═══════════════════════════════════════')
  console.log('  Results:')
  console.log('═══════════════════════════════════════')
  console.log(`Anthropic API:  ${anthropicOk ? '✅ Working' : '❌ Failed'}`)
  console.log(`Bright Data:    ${brightDataOk ? '✅ Configured' : '❌ Failed'}`)
  console.log('═══════════════════════════════════════\n')

  process.exit(anthropicOk && brightDataOk ? 0 : 1)
}

main().catch(console.error)
