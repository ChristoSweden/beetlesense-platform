import 'dotenv/config'
import express from 'express'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { config } from './config.js'
import { initializeQueues } from './queues/index.js'
import { createEchoQueue } from './processors/echo.processor.js'
import { logger } from './lib/logger.js'

async function startDashboard() {
  const queues = await initializeQueues()
  const echoQueue = createEchoQueue()

  const serverAdapter = new ExpressAdapter()
  serverAdapter.setBasePath('/admin/queues')

  createBullBoard({
    queues: [
      ...Object.values(queues).map((q) => new BullMQAdapter(q)),
      new BullMQAdapter(echoQueue),
    ],
    serverAdapter,
  })

  const app = express()

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'bull-board' })
  })

  // Bull Board UI
  app.use('/admin/queues', serverAdapter.getRouter())

  const port = config.bullBoard.port
  app.listen(port, () => {
    logger.info(
      { port, path: '/admin/queues' },
      `Bull Board dashboard running at http://localhost:${port}/admin/queues`,
    )
  })
}

startDashboard().catch((err) => {
  logger.fatal({ err }, 'Failed to start Bull Board dashboard')
  process.exit(1)
})
