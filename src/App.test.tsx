import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { webcrypto } from 'node:crypto'
import { App } from './App'
import { crossrefProvider } from './research/providers'
import { KnowledgeBank } from './research/bank'
beforeEach(() => {
  localStorage.clear()
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: webcrypto,
  })
})
afterEach(cleanup)
describe('LLM-free user workflow', () => {
  it('searches, inspects metadata, saves a categorized linked record, reloads and removes it', async () => {
    const work = {
      DOI: '10.5555/ui-fixture',
      title: ['Synthetic accessible literacy fixture'],
      author: [{ given: 'Test', family: 'Author' }],
      published: { 'date-parts': [[2025]] },
      type: 'journal-article',
    }
    const provider = crossrefProvider(async (url) =>
      url.includes('?') ? { message: { items: [work] } } : { message: work },
    )
    const bank = new KnowledgeBank(localStorage)
    const ui = render(<App bank={bank} providers={{ crossref: provider }} />)
    fireEvent.change(screen.getByLabelText('Educational research topic'), {
      target: { value: 'literacy instruction' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search research' }))
    const inspect = await screen.findByRole('button', {
      name: /Inspect reference:/,
    })
    fireEvent.click(inspect)
    await screen.findByText('Bibliographic status: verified')
    expect(
      screen
        .getByRole('link', { name: /Original publication reference/ })
        .getAttribute('href'),
    ).toContain('https://doi.org/10.5555/ui-fixture')
    fireEvent.change(screen.getByLabelText('Knowledge topic'), {
      target: { value: 'Literacy' },
    })
    fireEvent.click(screen.getByLabelText(/Associate with Grade 1/))
    fireEvent.click(
      screen.getByRole('button', { name: 'Save research locally' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Knowledge bank' }))
    expect(screen.getByText('Topics: Literacy')).toBeTruthy()
    expect(screen.getByText(/Related modules: grade-01-reading/)).toBeTruthy()
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Your knowledge bank' }),
    )
    ui.unmount()
    render(
      <App
        bank={new KnowledgeBank(localStorage)}
        providers={{ crossref: provider }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Knowledge bank' }))
    expect(screen.getByText('Topics: Literacy')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Remove record:/ }))
    expect(screen.getByText('0 saved records')).toBeTruthy()
  })
  it('uses native controls, reading adjustments and accessible learning content', () => {
    render(<App />)
    expect(
      screen.getByRole('link', { name: 'Skip to main content' }),
    ).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Text size'), {
      target: { value: 'extra' },
    })
    fireEvent.click(screen.getByLabelText('High contrast'))
    expect(document.querySelector('.high-contrast.reading-extra')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Learning resources' }))
    expect(screen.getByText(/must review and adapt/)).toBeTruthy()
    expect(document.querySelectorAll('summary')).toHaveLength(12)
  })
  it('renders hostile metadata as text and surfaces provider errors without saving', async () => {
    const provider = crossrefProvider(async (url) => {
      if (!url.includes('?')) throw new Error('Provider unavailable')
      return {
        message: {
          items: [
            {
              DOI: '10.5555/hostile-fixture',
              title: ['<img src=x onerror=alert(1)>'],
            },
          ],
        },
      }
    })
    render(<App providers={{ crossref: provider }} />)
    fireEvent.change(screen.getByLabelText('Educational research topic'), {
      target: { value: 'literacy' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Search research' }))
    fireEvent.click(
      await screen.findByRole('button', { name: /Inspect reference:/ }),
    )
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'Provider unavailable',
      ),
    )
    expect(document.querySelector('img')).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Save research locally' }),
    ).toBeNull()
    expect(new KnowledgeBank(localStorage).list()).toEqual([])
  })
})
