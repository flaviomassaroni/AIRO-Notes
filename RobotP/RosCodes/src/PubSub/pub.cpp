#include <chrono>
#include <functional>
#include <memory>
#include <string>

#include "rclcpp/rclcpp.hpp"
#include "std_msgs/msg/string.hpp"

using namespace std::chrono_literals;

class MinimalPub : public rclcpp::Node {

    public:
    // Publisher
    MinimalPub() : Node("minimalpub"), count_(0){
        publisher_ = this->create_publisher<std_msgs::msg::String> ("topic", 10); // Tye, Node, queue size
        timer_ = this->create_wall_timer(500ms, std::bind(&MinimalPub::timer_callback, this));
    }

    private:
    // What the publisher pushes on the node

    rclcpp::TimerBase::SharedPtr timer_;
    rclcpp::Publisher<std_msgs::msg::String>::SharedPtr publisher_;
    size_t count_;

    void timer_callback(){
        auto message = std_msgs::msg::String();
        message.data = "Hello, wordl!" + std::to_string(count_++);
        RCLCPP_INFO(this-> get_logger(), "Publishing '%s", message.data.c_str());
        publisher_ -> publish(message);
    }
};

int main(int argc, char * argv[]){
    
    rclcpp::init(argc, argv);
    rclcpp::spin(std::make_shared<MinimalPub>());
    rclcpp::shutdown();
    return 0;
}