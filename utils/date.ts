export const formatDateTime = (dateTimeString: string) => {
  try {
    const date = new Date(dateTimeString);
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    const formattedDate = date
      .toLocaleDateString("zh-TW", dateOptions)
      .replace(/\//g, "-");
    const formattedTime = date.toLocaleTimeString("zh-TW", timeOptions);

    return `${formattedDate} ${formattedTime}`;
  } catch (error) {
    console.error("日期格式化錯誤:", error);
    return dateTimeString;
  }
};

export const formatTime = (dateTimeString: string) => {
  try {
    const date = new Date(dateTimeString);
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    return date.toLocaleTimeString("zh-TW", timeOptions);
  } catch (error) {
    console.error("時間格式化錯誤:", error);
    return dateTimeString;
  }
};
