import { hotels, type Hotel } from "../../data/hotels";
import { PatternWall } from "../../ui/PatternWall";
import styles from "./page.module.css";

export default function TravelPage() {
  // Metro Hotel is the standout closest option — Content flagged it for a
  // visual callout. The page renders it first with a "Closest to the venue"
  // ribbon and the rest of the list follows in distance order.
  const [featured, ...rest] = hotels;

  return (
    <PatternWall>
      <div className={styles.page}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Travel &amp; hotels</p>
          <h1 className={styles.title}>Where to stay</h1>
          <p className={styles.lede}>
            The venue is in NoPa (the neighborhood just north of the Panhandle),
            centered on 838 Divisadero. Below are six places we&rsquo;d actually
            recommend, ordered by distance from the venue. Booking links go
            straight to each hotel&rsquo;s own site.
          </p>
        </header>

        <section aria-labelledby="featured-heading">
          <h2 id="featured-heading" className={styles.sectionHeading}>
            Closest to the venue
          </h2>
          <FeaturedHotelCard hotel={featured} />
        </section>

        <section aria-labelledby="more-heading">
          <h2 id="more-heading" className={styles.sectionHeading}>
            Other recommendations
          </h2>
          <ul className={styles.hotelList}>
            {rest.map((hotel) => (
              <li key={hotel.name} className={styles.hotelItem}>
                <HotelCard hotel={hotel} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PatternWall>
  );
}

function FeaturedHotelCard({ hotel }: { hotel: Hotel }) {
  return (
    <article className={`${styles.card} ${styles.featuredCard}`}>
      <span className={styles.featuredRibbon}>Walkable home after dinner</span>
      <CardBody hotel={hotel} />
    </article>
  );
}

function HotelCard({ hotel }: { hotel: Hotel }) {
  return (
    <article className={styles.card}>
      <CardBody hotel={hotel} />
    </article>
  );
}

function CardBody({ hotel }: { hotel: Hotel }) {
  return (
    <>
      <h3 className={styles.hotelName}>{hotel.name}</h3>
      <p className={styles.neighborhood}>
        {hotel.neighborhood} · {hotel.distance}
      </p>
      <p className={styles.description}>{hotel.description}</p>
      <p className={styles.cardFooter}>
        <a
          href={hotel.bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.bookingLink}
        >
          Book direct →
        </a>
      </p>
    </>
  );
}
