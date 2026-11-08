"use client";

export function StorytellingSection() {
  return (
    <section id="filosofi" className="border-b border-border bg-background py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Intro */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs uppercase tracking-[0.3em] font-semibold text-muted-foreground">
            Filosofi & Kisah Rasa
          </span>
          <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Seni Memasak Lambat di Tengah Dinamika Kampus
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Maison Kantin lahir dari sebuah keyakinan sederhana: kualitas santapan mahasiswa dan akademisi 
            tidak seharusnya dikorbankan demi kecepatan semata. Kami memadukan dedikasi koki berpengalaman 
            dengan sumber daya bahan pangan lokal terbaik.
          </p>
        </div>

        {/* Narrative Movement 1: Sourcing & Terroir */}
        <div className="mt-16 grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-md border border-border bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1500651230702-0e2d8a49d4ad?q=80&w=1000&auto=format&fit=crop"
                alt="Petani memanen rempah segar lokal di pagi hari"
                width={1000}
                height={667}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Babak I &bull; Integritas Bahan
            </div>
            <h3 className="mt-2 font-serif text-2xl font-bold text-foreground sm:text-3xl">
              Dari Kebun Mitra ke Dapur Stan Pilihan
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Setiap pagi sebelum fajar menyapa kampus, bahan-bahan segar diantarkan langsung oleh petani dan pemasok binaan. 
              Mulai dari kelapa tua segar yang diperas murni, cabai dan bawang pilihan, hingga beras organik aromatik. 
              Kami menolak penggunaan perisa sintetik instan, menjaga kemurnian rasa sebagaimana alam menyediakannya.
            </p>
            <div className="mt-6 border-l-2 border-foreground/30 pl-4 italic text-sm text-foreground/80 font-serif">
              &ldquo;Rasa sejati tidak dapat dipalsukan. Ia lahir dari ketulusan tanah dan ketelitian tangan yang merawatnya.&rdquo;
            </div>
          </div>
        </div>

        {/* Narrative Movement 2: Craftsmanship & Time */}
        <div className="mt-20 grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="order-2 lg:order-1 lg:col-span-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Babak II &bull; Keahlian & Waktu
            </div>
            <h3 className="mt-2 font-serif text-2xl font-bold text-foreground sm:text-3xl">
              Kesabaran Memasak yang Menghasilkan Kedalaman Rasa
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Para juru masak stan di Maison Kantin mendedikasikan waktu berjam-jam untuk proses reduksi kuah kaldu, 
              penyempurnaan fermentasi adonan, serta pemanggangan pada temperatur yang presisi. 
              Sajian rendang wagyu misalnya, dimasak perlahan hingga delapan belas jam agar rempah meresap sempurna 
              ke serat daging paling dalam.
            </p>
            <ul className="mt-6 space-y-3 text-xs uppercase tracking-wider text-muted-foreground font-medium">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden="true" />
                <span>Tanpa bahan pengawet sintetik atau pewarna buatan</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden="true" />
                <span>Teknik pematangan bertahap menjaga nilai nutrisi optimal</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" aria-hidden="true" />
                <span>Penyajian estetis yang menghormati kenyamanan indra penikmatnya</span>
              </li>
            </ul>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-6">
            <div className="relative overflow-hidden rounded-md border border-border bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop"
                alt="Koki menata sajian kuliner artisanal dengan konsentrasi tinggi"
                width={1000}
                height={667}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
