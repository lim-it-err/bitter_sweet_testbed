// 빌더를 고려하라, 생성자에 매개변수가 많다면.

//정적 팩터리와 생성자는 매개 변수가 많을 때 대응하기 어렵다.
//읽기 어렵고, 필요 없는 데이터도 많이 작성해야함.
public class Perfume{
    private int topNotes;
    private int middle_notes;
    private int base_notes;

    public Perfume(int topNotes, int middle_notes){
        this(topNotes, middle_notes, 0);
    }
    public Perfume(int topNotes, int middle_notes, int base_notes){
        this(topNotes, middle_notes, base_notes);
    }
}
// 이렇게 선택 매개변수를 N개 받는 생성자까지 늘려 나가는 형식을 "점층적 생성자 패턴"이라 한다.
// 당연하게도, 원치 않는 매개변수까지 정의해야 하여 정확성이 떨어지고, 가독성도 떨어짐


//자바빈즈 패턴 - 일관성이 깨지고, 불변으로 만들 수 없음.
public class Perfume2{
    private int topNotes;
    private int middleNotes;
    private int baseNotes;

    public Perfume2(){}

    public void setTopNotes(int val){
        topNotes = val;
    }
//    ...

}
//1. 객체 하나를 만들기 위해 N개의 메서드 호출
//2. 완전히 생성되기 전에 일관성의 문제가 생길 수 있음. -> 얼리는 방법이 있음.

//빌더 패턴.
public class HotelBooking {
    // 필수 매개변수
    private final String checkInDate;  // 체크인 날짜
    private final String checkOutDate; // 체크아웃 날짜

    // 선택 매개변수
    private final String roomType;     // 룸 타입 (예: 싱글, 더블, 스위트)
    private final boolean breakfastIncluded; // 조식 포함 여부
    private final String specialRequest;     // 추가 요청사항

    // Builder 내부 클래스
    public static class Builder {
        // 필수 매개변수
        private final String checkInDate;
        private final String checkOutDate;

        // 선택 매개변수 (기본값 설정)
        private String roomType = "Standard";    // 기본값: Standard 룸
        private boolean breakfastIncluded = false; // 기본값: 조식 미포함
        private String specialRequest = "";        // 기본값: 빈 요청

        // Builder 생성자 (필수 매개변수 초기화)
        public Builder(String checkInDate, String checkOutDate) {
            this.checkInDate = checkInDate;
            this.checkOutDate = checkOutDate;
        }

        // 선택 매개변수에 대한 설정 메서드 (체이닝 지원)
        public Builder roomType(String roomType) {
            this.roomType = roomType;
            return this;
        }

        public Builder breakfastIncluded(boolean breakfastIncluded) {
            this.breakfastIncluded = breakfastIncluded;
            return this;
        }

        public Builder specialRequest(String specialRequest) {
            this.specialRequest = specialRequest;
            return this;
        }

        // 최종 객체 생성
        public HotelBooking build() {
            return new HotelBooking(this);
        }
    }

    // private 생성자 (Builder를 통해서만 객체 생성 가능)
    private HotelBooking(Builder builder) {
        this.checkInDate = builder.checkInDate;
        this.checkOutDate = builder.checkOutDate;
        this.roomType = builder.roomType;
        this.breakfastIncluded = builder.breakfastIncluded;
        this.specialRequest = builder.specialRequest;
    }

    // toString() 메서드 (객체 상태 확인용)
    @Override
    public String toString() {
        return "HotelBooking{" +
                "checkInDate='" + checkInDate + '\'' +
                ", checkOutDate='" + checkOutDate + '\'' +
                ", roomType='" + roomType + '\'' +
                ", breakfastIncluded=" + breakfastIncluded +
                ", specialRequest='" + specialRequest + '\'' +
                '}';
    }
}