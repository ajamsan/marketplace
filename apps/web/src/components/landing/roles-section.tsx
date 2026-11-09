"use client";

const ROLES = [
  {
    index: "01",
    title: "Pembeli",
    audience: "Mahasiswa dan warga kampus yang memesan makanan.",
    items: [
      "Cari produk berdasarkan nama atau pilih stan tertentu.",
      "Susun keranjang dari beberapa stan sekaligus, dengan jumlah per produk.",
      "Lihat ringkasan total per stan sebelum membuat pesanan.",
      "Bayar tunai di kasir, lalu pantau status sampai pesanan siap diambil.",
      "Buka riwayat pesanan dan cabut sesi yang tidak dikenal.",
    ],
  },
  {
    index: "02",
    title: "Penjual",
    audience: "Pengelola stan yang menyiapkan dan menerima pembayaran.",
    items: [
      "Ajukan stan, lalu kelola setelah disetujui admin.",
      "Unggah produk dengan harga, foto, dan status ketersediaan.",
      "Lihat antrean pesanan yang masuk ke stan kamu.",
      "Konfirmasi uang tunai dengan kode order dan jumlah yang diterima.",
      "Tandai pesanan sedang disiapkan dan siap diambil.",
    ],
  },
  {
    index: "03",
    title: "Admin",
    audience: "Operasional kampus yang menjaga kualitas stan.",
    items: [
      "Tinjau pengajuan stan baru beserta dokumennya.",
      "Setujui, tolak, atau nonaktifkan stan dengan alasan.",
      "Pantau status stan tanpa mengubah data transaksi.",
    ],
  },
];

export function RolesSection({ titleAs = "h2" }: { titleAs?: "h1" | "h2" }) {
  const TitleTag = titleAs;
  const titleClass =
    titleAs === "h1"
      ? "font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
      : "font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground";

  return (
    <section id="peran" className="border-b border-border bg-surface-muted/40 py-20 md:py-28">
      <div className="reveal mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-1 border-b border-border/80 pb-6 mb-10 md:mb-12 max-w-3xl">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground block">
            Tiga peran
          </span>
          <TitleTag className={titleClass}>
            Satu sistem, tiga ruang kerja
          </TitleTag>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Setiap peran hanya melihat menu yang relevan. Hak akses diperiksa di server, bukan
            hanya di tampilan.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <p className="mt-10 border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">
              Akun admin tidak dibuka untuk pendaftaran umum. Akun tersebut dibuat oleh operator
              kampus yang mengelola stan.
            </p>
          </div>

          <div className="lg:col-span-8">
            {ROLES.map((role) => (
              <article
                key={role.index}
                className="grid grid-cols-1 gap-4 border-t border-border py-9 first:border-t-0 first:pt-0 sm:grid-cols-[3.5rem_1fr] sm:gap-6"
              >
                <span
                  aria-hidden="true"
                  className="font-serif text-sm font-semibold tabular-nums text-muted-foreground"
                >
                  {role.index}
                </span>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <h3 className="font-serif text-2xl font-bold tracking-tight text-foreground">
                      {role.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{role.audience}</p>
                  </div>

                  <ul className="mt-5 grid grid-cols-1 gap-x-10 gap-y-2.5 sm:grid-cols-2">
                    {role.items.map((item) => (
                      <li
                        key={item}
                        className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/60"
                        />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}