export interface CouponCafe {
  id: string;
  name: string;
  location: string;
  accepts: string;
  hours: string;
}

export const couponCafes: CouponCafe[] = [
  {
    id: "cafe-01",
    name: "Cafe A",
    location: "Mahallah Ali",
    accepts: "Breakfast & Lunch",
    hours: "7:00 AM – 3:00 PM"
  },
  {
    id: "cafe-02",
    name: "Cafe B",
    location: "Near KICT",
    accepts: "All meals",
    hours: "7:00 AM – 9:00 PM"
  },
  {
    id: "cafe-03",
    name: "Cafe C",
    location: "ICC Ground Floor",
    accepts: "Lunch only",
    hours: "11:00 AM – 3:00 PM"
  },
  {
    id: "cafe-04",
    name: "Cafe D",
    location: "Mahallah Aminah",
    accepts: "All meals",
    hours: "7:00 AM – 9:00 PM"
  },
  {
    id: "cafe-05",
    name: "Cafe E",
    location: "SHAS Mosque area",
    accepts: "Breakfast & Dinner",
    hours: "7:00 AM – 10:00 AM, 5:00 PM – 9:00 PM"
  },
  {
    id: "cafe-06",
    name: "Cafe F",
    location: "Main Auditorium concourse",
    accepts: "Lunch only",
    hours: "12:00 PM – 2:30 PM"
  }
];
