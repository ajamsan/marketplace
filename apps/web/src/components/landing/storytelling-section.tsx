"use client";

const STORY_BLOCKS = [
  {
    number: "01",
    title: "Dari antrean ke pesanan",
    text: "Mahasiswa dulu menghabiskan istirahat berdiri di antrean, tidak tahu apa yang tersedia, dan membayar dengan uang pas yang sulit. Kini mereka membuka ponsel, melihat menu lengkap dari tempat duduk, dan pesanan siap saat mereka tiba.",
  },
  {
    number: "02",
    title: "Stan yang terlihat, bukan yang paling bising",
    text: "Dulu stan dengan suara terkeras mendapat pelanggan. Sekarang setiap stan tampil dengan foto, harga, dan ketersediaan yang jujur. Pembeli memilih berdasarkan selera, bukan kebisingan.",
  },
  {
    number: "03",
    title: "Pembayaran yang percaya pada kasir",
    text: "Tidak ada payment gateway yang gagal, tidak ada QRIS yang error, tidak ada dana tersangkut. Uang tunai diserahkan ke kasir, kasir menekan tombol, sistem mencatat. Sederhana, dan itu justru yang paling andal.",
  },
];

export function StorytellingSection({ titleAs = "h2" }: { titleAs?: "h1" | "h2" }) {
  const TitleTag = titleAs;
  const titleClass =
    titleAs === "h1"
      ? "font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
      : "font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground";

  return (
    <section id="cerita" className="border-b border-border bg-surface-muted/30 py-20 md:py-28">
      <div className="reveal mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-1 border-b border-border/80 pb-6 mb-10 md:mb-12 max-w-3xl">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground block">
            Cerita kami
          </span>
          <TitleTag className={titleClass}>
            Mengubah cara kampus makan, satu pesanan setiap saat
          </TitleTag>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Bukan tentang teknologi canggih. Tentang menghormati waktu, memperjuangkan kejujuran, dan
            memberi ruang bagi makanan yang layak disantap.
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-3">
          {STORY_BLOCKS.map((block, index) => (
            <article
              key={block.number}
              className="group relative overflow-hidden"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
              <div className="relative p-6 bg-surface border border-border rounded-sm transition-all duration-300 hover:border-foreground/30 hover:shadow-lg">
                <div className="flex items-baseline gap-3">
                  <span
                    aria-hidden="true"
                    className="font-serif text-4xl font-bold tracking-tight text-foreground/15 group-hover:text-foreground/30 transition-colors duration-300"
                  >
                    {block.number}
                  </span>
                  <h3 className="font-serif text-xl font-bold tracking-tight text-foreground">
                    {block.title}
                  </h3>
                </div>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {block.text}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-16 border-t border-border pt-10">
          <blockquote className="relative pl-10 md:pl-16">
            <span aria-hidden="true" className="absolute left-0 top-0 font-serif text-6xl font-bold text-foreground/10 leading-none">
              &ldquo;
            </span>
            <p className="font-serif text-xl md:text-2xl font-medium leading-relaxed text-foreground">
              &ldquo;Kami tidak membangun aplikasi. Kami membangun kepercayaan antara lapar dan masakan.&rdquo;
            </p>
            <footer className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
              <span aria-hidden="true" className="h-px w-16 bg-foreground/30" />
              <cite className="not-italic font-medium text-foreground">Tim Kantin Kampus</cite>
            </footer>
          </blockquote>
        </div>
      </div>
    </section>
  );
}