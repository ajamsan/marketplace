"use client";

const READY = [
  "Katalog produk dengan pencarian dan filter stan.",
  "Keranjang lintas stan dan checkout dengan ringkasan per stan.",
  "Pembayaran tunai yang dikonfirmasi kasir per stan.",
  "Verifikasi akun dengan kode OTP lewat email.",
  "Pengelolaan stan, produk, foto, dan sesi aktif.",
];

const NOT_READY = [
  "Payment gateway dan penyelesaian QRIS. QRIS masih placeholder dan ditolak secara default.",
  "Pengiriman, pelacakan kurir, dan notifikasi push.",
  "Deployment produksi: HTTPS, domain, secret manager, backup terjadwal, dan monitoring.",
  "Review keamanan independen.",
];

export function ScopeSection({ titleAs = "h2" }: { titleAs?: "h1" | "h2" }) {
  const TitleTag = titleAs;
  const titleClass =
    titleAs === "h1"
      ? "font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
      : "font-serif text-2xl sm:text-3xl font-bold tracking-tight text-foreground";

  return (
    <section id="cakupan" className="border-b border-border bg-background py-20 md:py-28">
      <div className="reveal mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-1 border-b border-border/80 pb-6 mb-10 md:mb-12 max-w-3xl">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground block">
            Cakupan pilot
          </span>
          <TitleTag className={titleClass}>
            Apa yang sudah bisa dipakai, dan apa yang belum
          </TitleTag>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Build ini berjalan di lingkungan lokal untuk uji coba. Daftar di bawah menjelaskan
            batasnya supaya tidak ada janji yang belum bisa dipenuhi.
          </p>
        </header>

        <div
          role="note"
          className="mb-8 rounded-sm border border-border bg-surface-muted/40 px-5 py-4 text-sm leading-relaxed text-muted-foreground"
        >
          Jangan memakai build ini untuk transaksi uang sungguhan sampai checklist rilis pilot di
          dokumentasi operasional terpenuhi. Detail teknis ada di{" "}
          <code className="rounded-sm bg-surface px-1.5 py-0.5 text-[13px] text-foreground">
            docs/OPERATIONS.md
          </code>{" "}
          dan{" "}
          <code className="rounded-sm bg-surface px-1.5 py-0.5 text-[13px] text-foreground">
            docs/SECURITY.md
          </code>{" "}
          pada repositori.
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-sm border border-border bg-surface p-7 sm:p-9">
            <h3 className="font-serif text-2xl font-bold tracking-tight text-foreground">
              Sudah berjalan di build ini
            </h3>
            <ul className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {READY.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-success" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-sm bg-foreground p-7 text-background sm:p-9">
            <h3 className="font-serif text-2xl font-bold tracking-tight">Belum ada</h3>
            <ul className="mt-6 space-y-3">
              {NOT_READY.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-background/75">
                  <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-background/60" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}