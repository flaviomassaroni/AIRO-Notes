#include "rclcpp/rclcpp.hpp"
#include "example_interfaces/srv/add_two_ints.hpp"
#include <chrono>
#include <memory>
#include <cstdlib>

using namespace std::chrono_literals;

int main(int argc, char ** argv)
{
  rclcpp::init(argc, argv);

  std::shared_ptr<rclcpp::Node> node = rclcpp::Node::make_shared("add_two_ints_client");
  auto client = node->create_client<example_interfaces::srv::AddTwoInts>("add_two_ints");

  while (!client->wait_for_service(1s)) {
    if (!rclcpp::ok()) {
      RCLCPP_ERROR(rclcpp::get_logger("rclcpp"), "Interrupted while waiting for the service. Exiting.");
      return 0;
    }
    RCLCPP_INFO(rclcpp::get_logger("rclcpp"), "service not available, waiting again...");
  }

  auto request = std::make_shared<example_interfaces::srv::AddTwoInts::Request>();
  
  if (argc > 1) {
      request->a = std::atoll(argv[1]);
      request->b = std::atoll(argv[2]);
  } else {
      request->a = 1;
      request->b = 2;
  }

  auto result = client->async_send_request(request);
  
  // Attendi il risultato
  if (rclcpp::spin_until_future_complete(node, result) == rclcpp::FutureReturnCode::SUCCESS)
  {
    // Corretto: RCLCPP_INFO e rclcpp::get_logger
    RCLCPP_INFO(rclcpp::get_logger("rclcpp"), "Sum: %ld", result.get()->sum);
  }
  else
  {
    // Corretto: rclcpp::get_logger (era het_logger)
    RCLCPP_ERROR(rclcpp::get_logger("rclcpp"), "Failed to call service!");
  }

  rclcpp::shutdown();
  return 0;
}