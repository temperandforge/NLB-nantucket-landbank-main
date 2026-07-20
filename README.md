# Nantucket Landbank - Next.js + Sanity (Vercel)

This template includes a [Next.js](https://nextjs.org/) app with a [Sanity Studio](https://www.sanity.io/) – an open-source React application that connects to your Sanity project’s hosted dataset. The Studio is configured locally and can then be deployed for content collaboration.

## Features

- **Next.js 16 for Performance:** Leverage the power of Next.js 16 App Router for blazing-fast performance and SEO-friendly static sites.
- **Real-time Visual Editing:** Edit content live with Sanity's [Presentation Tool](https://www.sanity.io/docs/presentation) and see updates in real time.
- **Live Content:** The [Live Content API](https://www.sanity.io/live) allows you to deliver live, dynamic experiences to your users without the complexity and scalability challenges that typically come with building real-time functionality.
- **Customizable Pages with Drag-and-Drop:** Create and manage pages using a page builder with dynamic components and [Drag-and-Drop Visual Editing](https://www.sanity.io/visual-editing-for-structured-content).
- **Powerful Content Management:** Collaborate with team members in real-time, with fine-grained revision history.
- **AI-powered Media Support:** Auto-generate alt text with [Sanity AI Assist](https://www.sanity.io/ai-assist).
- **On-demand Publishing:** No waiting for rebuilds—new content is live instantly with Incremental Static Revalidation.
- **Easy Media Management:** [Integrated Unsplash support](https://www.sanity.io/plugins/sanity-plugin-asset-source-unsplash) for seamless media handling.

## Demo

https://nlb-main.vercel.app

## Getting Started

### Installing the template

> **Already deployed with Vercel?** If you've already deployed using the **Sanity + Vercel Integration** or **one-click Vercel button**, please visit our [Vercel deployment instructions](vercel-installation-instructions.md) to set up your local environment and deploy Sanity Studio.

#### 1. Copy the .example.env files and update the values - found in sanity and mapbox

#### 2. Run Studio and Next.js app locally

Navigate to the template directory using `cd <your app name>`, and start the development servers by running the following command

```shell
npm i
npm run dev
```

#### 3. Open the app and sign in to the Studio

Open the Next.js app running locally in your browser on [http://localhost:3000](http://localhost:3000).

Open the Studio running locally in your browser on [http://localhost:3333](http://localhost:3333). You should now see a screen prompting you to log in to the Studio. Use the same service (Google, GitHub, or email) that you used when you logged in to the CLI.

### Adding content with Sanity

#### 1. Publish your first document

The template comes pre-defined with a schema containing `Page`, `Post`, `Person`, and `Settings` document types.

From the Studio, click "+ Create" and select the `Post` document type. Go ahead and create and publish the document.

Your content should now appear in your Next.js app ([http://localhost:3000](http://localhost:3000)) as well as in the Studio on the "Presentation" Tab


#### 3. Extending the Sanity schema

The schema for the `Post` document type is defined in the `studio/src/schemaTypes/post.ts` file. You can [add more document types](https://www.sanity.io/docs/studio/schema-types) to the schema to suit your needs.

## Resources

- [Sanity documentation](https://www.sanity.io/docs)
- [Next.js documentation](https://nextjs.org/docs)
- [Join the Sanity Community](https://slack.sanity.io)
- [Learn Sanity](https://www.sanity.io/learn)

[vercel-deploy]: https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsanity-io%2Fsanity-template-nextjs-clean&project-name=nextjs-clean-website-sanity-template&repository-name=nextjs-clean-website-sanity-template&demo-title=Clean%20Next.js%20%2B%20Sanity%20app&demo-description=A%20clean%20Next.js%20plus%20Sanity%20starter%20with%20real-time%20visual%20editing%2C%20drag-and-drop%20page%20builder%2C%20AI%20media%20support%2C%20and%20live%20content%20updates.&demo-url=https%3A%2F%2Ftemplate-nextjs-clean.sanity.build%2F&demo-image=https%3A%2F%2Fraw.githubusercontent.com%2Fsanity-io%2Fsanity-template-nextjs-clean%2Frefs%2Fheads%2Fmain%2Fsanity-next-preview.png&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22sanity%22%2C%22productSlug%22%3A%22project%22%2C%22protocol%22%3A%22other%22%7D%5D&root-directory=frontend
