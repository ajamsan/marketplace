"use client";

const VALUES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Kejujuran di setiap detail",
    description: "Foto produk dari penjual asli. Harga tanpa biaya tersembunyi. Status ketersediaan yang akurat. Jika habis, tertulis habis. Tidak ada kemegahan yang dibangun di atas kebohongan.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Komunitas sebelum komisi",
    description: "Stan dipelihara oleh warga kampus, untuk warga kampus. Keuntungan bukan metrik utama, keberlanjutan stan dan kepuasan makan adalah. Kami ada karena stan dan pembeli saling percaya.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6" aria-hidden="true">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
    title: "Kesederhanaan yang sengaja",
    description: "Tidak ada fitur yang tidak dipakai. Tidak ada animasi yang mengganggu. Setiap tombol, setiap layar, setiap notifikasi ada karena memecahkan masalah nyata. Kompleksitas disembunyikan, kesederhanaan ditampilkan.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "Keandalan tanpa dramatisasi",
    description: "Sistem mencatat setiap perubahan status dengan waktu yang tepat. Kasir menekan tombol, pembeli tahu. Tidak ada estimasi palsu, tidak ada loading yang bohong. Yang terlihat adalah yang terjadi.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
    title: "Dibangun untuk aksesibilitas",
    description: "Keyboard navigation, screen reader, kontras WCAG AA, reduced motion, ukuran sentuh 44px. Bukan checklist, bukan kompromi. Setiap warga kampus berhak memesan dengan cara yang nyaman baginya.",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
    title: "Data milik pengguna",
    description: "Riwayat pesanan, preferensi, akun, milik Anda. Kami tidak menjual data, tidak memasang tracker tersembunyi, tidak membangun profil iklan. Privasi bukan fitur tambahan, itu dasar.",
  },
];

export function ValuesSection() {
  return (
    <section id="nilai" className="border-b border-border bg-background py-20 md:py-28">
      <div className="reveal mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-1 border-b border-border/80 pb-6 mb-10 md:mb-12 max-w-3xl">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground block">
            Prinsip kami
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Enam nilai yang menuntun setiap keputusan produk
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Bukan slogan. Setiap nilai di bawah ini terukir dalam kode, dalam desain, dan dalam cara kami berkomunikasi dengan stan dan pembeli.
          </p>
        </header>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((value, index) => (
            <article
              key={value.title}
              className="group relative p-6 bg-surface border border-border rounded-sm transition-all duration-300 hover:border-foreground/30 hover:shadow-lg"
              style={{ transitionDelay: `${index * 80}ms` }}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-sm bg-accent-soft text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors duration-300 mb-5">
                {value.icon}
              </div>
              <h3 className="font-serif text-lg font-bold tracking-tight text-foreground mb-2">
                {value.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {value.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}