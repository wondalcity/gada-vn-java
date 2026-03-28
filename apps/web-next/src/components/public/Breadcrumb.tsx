import { Link } from '@/components/navigation'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface Props {
  items: BreadcrumbItem[]
  locale?: string
}

export function Breadcrumb({ items }: Props) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `https://gada.vn${item.href}` } : {}),
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="breadcrumb" className="mb-4">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-[#98A2B2]">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-[#EFF1F5]">/</span>}
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-[#0669F7] transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-[#25282A] font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}
