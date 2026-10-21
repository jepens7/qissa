---
id: ep01
nomor: 1
judul: Tangkapan Layar
pov: Raka
durasi_menit: 5
rating: 17+
teaser: Seorang teman mengirimkan tangkapan layar chat pribadi Nadia. Kamu belum membukanya. Tapi ibu jarimu sudah di atasnya.
sampul: Kamu adalah Raka, 23 tahun, ngekos di Depok. Malam ini seorang teman mengirimkan sesuatu yang bukan untukmu.
refleksi: Kapan terakhir kali kamu melihat sesuatu yang bukan untukmu, dan apa yang kamu lakukan setelahnya?
bagikan: |
  Temen lu ngirim screenshot chat pribadi orang yang lu kenal. Caption-nya: “anak hijrah ternyata gitu ya”.

  Lu bakal gimana?
  Buka · Tutup · Tegur

  Qissa, Episode 1: Tangkapan Layar
berikutnya: ep02
vars: [dibaca, menegur]
---

::: shot nadia-bram
cap: Tangkapan layar, chat Nadia
cut: dipotong di sini
pov: Nadia
Bram: Besok jadi ke rumah?
Nadia: InsyaAllah. Jam 7 ya, aku langsung dari kantor.
Bram: Nginep aja kalau kemaleman. Kamar atas kosong.
Nadia: Lihat nanti.
:::

== pembuka
@view Gilang | G | online | Chat dengan Gilang
> Selasa, 22.41. Kos Kukusan, Depok. Laptop masih menyala, pesanan sepatu belum dibungkus.
Gilang: rak
Gilang: lu masih temenan sama nadia?
Raka: masih lah. knp
Gilang: jangan kaget ya
@shot closed
Gilang: anak hijrah ternyata gitu ya wkwk
> Kamu belum membukanya. Tapi ibu jarimu sudah di atasnya.
Gilang: buka dulu baru komen
[Pilihan 1 dari 2] #p1
* Buka dan baca semuanya -> baca #Buka
* Tutup, jangan dibuka -> tutup #Tutup
* Balas: “Kenapa lu kirim ke gue?” -> tegur #Tegur

== baca
@set dibaca
> Empat gelembung. Dipotong rapi di bagian atas, seperti disengaja.
@shot nadia-bram
Gilang: udah liat kan
Gilang: NGINEP anjir
Gilang: gue sih ga nyangka. dia yang paling rajin ngingetin orang salat
> Kamu membacanya tiga kali. Yang ketiga, kamu sadar kamu sedang mencari alasan untuk percaya.
Gilang: gue kirim ke grup sisa UI ga?
> Kamu mengetik “jangan”. Menghapusnya. Mengetik “terserah”. Menghapusnya juga.
Gilang: ya udah gue pikir2 dulu
> Kamu tidak menjawab. Dan kamu tidak bilang jangan.
-> pagi

== tutup
> Kamu menaruh HP menghadap ke bawah. Layar laptop jadi satu-satunya cahaya di kamar.
Gilang: lah
Gilang: kok ga dibuka?
Gilang: penting ini woy
Gilang: lu takut ya wkwk
Gilang: ya udah gue kirim ke yang lain aja
> Rasa penasaran itu tidak hilang. Tapi malam ini, bukan kamu yang membawanya. Besok, orang lain yang akan membawanya ke mana-mana.
@view Dimas | D | online | Chat dengan Dimas
Dimas: lu dikirimin gilang jg?
Raka: iya. ga gue buka
Dimas: sama. udah gue hapus
Dimas: tp gilang ga akan berhenti di kita
-> pagi

== tegur
@set menegur
Raka: Kenapa lu kirim ke gue?
Gilang: ya biar lu tau aja orangnya kayak gimana
Gilang: lu kan deket sama dia
Gilang: atau lu masih suka? wkwk
Raka: Gue ga nanya dia gimana. Gue nanya lu ngapain nyebarin.
@typing
Gilang: santai
Gilang: gue cuma kirim ke lu doang
Gilang: ya udah gue hapus deh
> Kamu tidak tahu apakah dia benar-benar menghapusnya. Kamu juga tidak membukanya. Malam itu kamu tidur, tapi tidak nyenyak.
-> pagi

== pagi
> Rabu, 07.52. KRL Depok–Sudirman, gerbong tengah, berdiri. Grup “Sisa UI 2021” sudah 46 pesan sejak subuh.
@view Sisa UI 2021 | S | 12 anggota | Grup Sisa UI 2021
Tika: ada yang mau cerita ga nih
Gilang: cerita apaan
Tika: lu kan yang paling tau
Dimas: udah woy
Tika: kenapa dim. gue salah nanya?
> Nadia ada di grup itu. Nadia belum menulis apa-apa.
@view Nadia | N | online | Chat dengan Nadia
Nadia: Rak.
Nadia: Lu di grup, kan. Dari tadi gue kayak lagi diomongin, tapi ga ada yang ngomong langsung.
Nadia: Lu tau sesuatu ga?
?? dibaca
> Kamu tahu persis apa yang mereka omongkan. Kamu bahkan hafal kalimatnya.
?? else
> Kamu tahu ada sesuatu. Kamu hanya belum tahu isinya, dan sekarang itu terasa seperti keberuntungan.
?? end
[Pilihan 2 dari 2] #p2
* Bilang ga tau -> akhir_gatau #Ga tau
* Cerita semuanya -> akhir_cerita #Cerita semuanya
* “Ketemu dulu yuk. Jangan di chat.” -> akhir_ketemu #Ketemu dulu

== akhir_gatau
Raka: Ga tau, Nad. Gue juga baru bangun
Nadia: Oke.
Nadia: Makasih ya.
> Dibaca 07.58. “Makasih ya” dari Nadia selalu berarti dua hal. Kamu tidak yakin yang mana.
> Kamis malam. Dua hari kemudian.
@view Sisa UI 2021 | S | 11 anggota | Grup Sisa UI 2021
@sys Nadia keluar dari grup
@view Nadia | N | terakhir dilihat hari ini | Chat dengan Nadia
Nadia: Tika bilang lu udah tau dari Selasa.
Nadia: Lu tau, kan.
? dibaca: Nadia: Dan lu baca.
> Kamu mengetik. Menghapus. Mengetik lagi. Layar HP padam sendiri sebelum kamu selesai.
-> penutup

== akhir_cerita
Raka: Ada screenshot chat lu sama Bram. Gilang yang nyebarin. Dari Selasa malem.
@typing
Nadia: Lu baca?
=> dibaca: cerita_dibaca | menegur: cerita_tegur | cerita_tutup

== cerita_dibaca
Raka: Iya.
Nadia: Oke.
Nadia: Gue ga akan jelasin, Rak. Lu temen gue lima tahun. Kalau lu butuh penjelasan, berarti lu udah milih percaya yang mana.
> Dia tidak marah. Itu yang paling berat.
-> penutup

== cerita_tutup
Raka: Enggak. Gue tutup.
Nadia: Makasih.
Nadia: Tapi orang lain baca.
Raka: Iya.
Nadia: Gue harus ngomong sama Bram dulu.
> Kamu tidak tahu apa yang akan dia katakan ke Bram. Kamu hanya tahu malam ini dia tidak menghadapinya sendirian. Dan itu bukan karena kamu.
-> penutup

== cerita_tegur
Raka: Enggak, ga gue buka. Gue tanya Gilang ngapain nyebar.
Nadia: Dan dia bilang apa?
Raka: Katanya cuma dikirim ke gue.
Nadia: Dia bohong. Tika nanya gue tadi subuh.
Nadia: Tapi makasih udah nanya dia. Lu satu-satunya yang nanya.
> Satu-satunya. Kamu tidak tahu harus bangga atau sedih.
-> penutup

== akhir_ketemu
Raka: Ketemu dulu yuk. Jangan di chat.
Nadia: Stasiun Depok Baru, jam 6?
Raka: Oke
> Sore. Bangku di ujung peron, dekat warung kopi sachet. Kamu menceritakan semuanya dalam dua menit. Dia tidak menangis. Dia hanya bertanya satu hal.
Nadia: Lu baca?
?? dibaca
> Kamu bilang iya. Dia mengangguk, seperti sudah tahu sejak kamu duduk.
?? else
> Kamu bilang enggak. Dia menatapmu lama, mencari kebohongan, dan tidak menemukannya.
?? end
Nadia: Jangan bela gue di grup.
Nadia: Gue ga butuh dibela. Gue cuma butuh satu orang yang ga ikut.
> KRL ke arah Bogor lewat. Dia pulang lebih dulu. Kamu duduk sampai warung kopinya tutup.
-> penutup

== penutup
> Malam itu, 23.58. Kamar kos. Layar HP-mu menyala sendiri.
@notif Gacor Family | 14 pesan baru | 23.58
> Kamu menggesernya hilang. Seperti biasa.
-> END
