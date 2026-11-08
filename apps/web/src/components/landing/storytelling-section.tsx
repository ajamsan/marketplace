"use client";

export function StorytellingSection() {
  return (
    <section id="tentang" className="border-b border-border bg-background py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
            Tentang Kami
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Kantin kampus yang praktis dan nyaman
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Kami ingin membuat santap siang di kampus lebih mudah: pilih menu dari berbagai stan,
            pesan tanpa antre, lalu ambil di kasir. Sederhana, cepat, dan tetap terjangkau.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="text-sm font-semibold text-foreground">Segar Setiap Hari</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Bahan baku dipilih segar dan dimasak hari itu juga. Tidak ada bahan sintetis yang tidak perlu.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="text-sm font-semibold text-foreground">Stan Pilihan Kampus</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Setiap stan melewati seleksi sederhana: rasa enak, harga wajar, dan kebersihan terjaga.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="text-sm font-semibold text-foreground">Bayar di Kasir</div>
            <p className="mt-2 text-sm text-muted-foreground">
              Pesan online, lalu bayar tunai di kasir stan. Tidak perlu antre panjang saat jam istirahat.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
