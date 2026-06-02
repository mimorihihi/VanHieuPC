import { STATIC_HOME_NEWS } from "@/lib/mock-home-news"

export function InstagramFeed() {
  return (
    <section className="bg-white py-8 lg:py-10">
      <div className="container mx-auto px-4">
        <h2 className="mb-6 text-sm font-bold text-zinc-900">
          Follow us on Instagram for News, Offers & More
        </h2>

        <div className="grid grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 xl:grid-cols-6">
          {STATIC_HOME_NEWS.map((item) => (
            <article key={item.id} className="group">
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden bg-zinc-100"
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </a>

              <div className="px-1 pt-3 text-center">
                <p className="line-clamp-5 text-[10px] leading-4 text-zinc-700 md:text-[11px]">
                  {item.excerpt}
                </p>
                <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-zinc-400">
                  {item.publishedAt}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
