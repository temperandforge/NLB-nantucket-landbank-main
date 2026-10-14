import CardProperty from '@/components/cards/CardProperty'
import type {PropertyDefaultImage, PropertyItem} from '@/components/cards/types'
import ButtonLink from '@/components/ui/ButtonLink'

/**
 * The Properties Preview markup (Figma: Properties Preview): a heading and a button above up to
 * three property cards, in a row from 1024px and stacked below it. Used by the Properties Preview
 * block and by the property page's "more properties" section.
 */
export default function PropertiesPreviewView({
  heading,
  button,
  properties,
  defaultImage,
}: {
  heading?: string | null
  button?: {label: string; href: string} | null
  properties: (PropertyItem | null)[]
  defaultImage: PropertyDefaultImage
}) {
  // A reference to an unpublished property dereferences to null.
  const shown = properties.filter((property): property is PropertyItem => Boolean(property?.name))
  if (!heading && !button && shown.length === 0) return null

  return (
    <section className="bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-8 tf-max-w md:gap-10">
        {(heading || button) && (
          <div className="flex w-full flex-col items-start gap-8 md:flex-row md:justify-between">
            {heading && (
              <h2 className="m-0 max-w-[434px] text-headline-lg leading-[1.1] text-on-background">
                {heading}
              </h2>
            )}
            {button && <ButtonLink label={button.label} href={button.href} rightIcon className="shrink-0" />}
          </div>
        )}
        {shown.length > 0 && (
          <ul className="grid w-full list-none grid-cols-1 gap-8 p-0 md:gap-10 lg:grid-cols-3 lg:gap-3">
            {shown.map((property) => (
              <li key={property._id}>
                <CardProperty property={property} defaultImage={defaultImage} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
