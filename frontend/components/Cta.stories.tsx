import type {Meta, StoryObj} from '@storybook/nextjs-vite'

import CTA from './Cta'

const meta: Meta<typeof CTA> = {
  title: 'Components/CTA',
  component: CTA,
}

export default meta
type Story = StoryObj<typeof CTA>

export const Default: Story = {
  args: {
    index: 0,
    pageType: 'page',
    pageId: 'preview',
    block: {
      _type: 'callToAction',
      _key: 'preview-cta',
      eyebrow: 'Eyebrow text',
      heading: 'Call to action heading',
      body: [],
      button: null,
      theme: 'light',
      contentAlignment: 'textFirst',
    },
  },
}
